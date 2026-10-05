// Fallbacks for features some iPhone/iPad Safari versions lack (the Claude iOS app uses Safari's engine).
// Must be imported before pdf.js runs.

// ReadableStream async iteration (`for await (x of stream)`): missing in Safari; pdf.js uses it for page text.
const RS = (globalThis as { ReadableStream?: { prototype: object } }).ReadableStream;
if (RS && !(Symbol.asyncIterator in RS.prototype)) {
  Object.defineProperty(RS.prototype, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* (this: ReadableStream) {
      const reader = this.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// Promise.withResolvers: Safari 17.4+.
const P = Promise as unknown as { withResolvers?: () => unknown };
if (!P.withResolvers) {
  P.withResolvers = function () {
    let resolve!: (v: unknown) => void, reject!: (e: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Object.hasOwn: Safari 15.4+.
const O = Object as unknown as { hasOwn?: (o: object, k: PropertyKey) => boolean };
if (!O.hasOwn) O.hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export {};
