import { Tokenizer } from '@huggingface/tokenizers';
/** The same NLI logits/softmax as Transformers.js, using only tokenizer + ONNX. */
export class NLIRuntime {
  constructor({ tokenizerJSON, tokenizerConfig, config, session, Tensor }) {
    this.tokenizer = new Tokenizer(tokenizerJSON, tokenizerConfig); this.session = session; this.Tensor = Tensor;
    this.entailment = config.label2id?.entailment; this.contradiction = config.label2id?.contradiction;
    if (![this.entailment, this.contradiction].every(Number.isInteger)) throw new Error('Invalid NLI label mapping.');
  }
  tokenCount(text) { return this.tokenizer.encode(text).ids.length; }
  async scores(premise, labels, { hypothesisTemplate = 'This text is {}.', multiLabel = true } = {}) {
    const logits = [];
    for (const label of labels) {
      const encoded = this.tokenizer.encode(premise, { text_pair: hypothesisTemplate.replace('{}', label), return_token_type_ids: true });
      if (encoded.ids.length > 512) throw new Error('The complete NLI input exceeds model context.');
      const data = { input_ids: encoded.ids, attention_mask: encoded.attention_mask, token_type_ids: encoded.token_type_ids }, feeds = {};
      let output;
      try {
      for (const name of this.session.inputNames) {
        if (!Array.isArray(data[name]) || data[name].length !== encoded.ids.length) throw new Error('Unsupported model input.');
        feeds[name] = new this.Tensor('int64', BigInt64Array.from(data[name], BigInt), [1, encoded.ids.length]);
      }
      output = await this.session.run(feeds); const values = output.logits?.data;
      if (!values || !Number.isFinite(values[this.entailment]) || !Number.isFinite(values[this.contradiction])) throw new Error('Invalid NLI output.');
      logits.push([Number(values[this.contradiction]), Number(values[this.entailment])]);
      } finally {
        for (const tensor of new Set([...Object.values(feeds),...Object.values(output||{})])) tensor.dispose?.();
      }
    }
    if (multiLabel) return logits.map(([c, e]) => 1 / (1 + Math.exp(c - e)));
    const max = Math.max(...logits.map(x => x[1])), values = logits.map(x => Math.exp(x[1] - max)), total = values.reduce((a, b) => a + b, 0);
    return values.map(x => x / total);
  }
  dispose() { return this.session.release(); }
}
