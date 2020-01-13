import './style.css';
import findAndReplaceDOMText from 'findandreplacedomtext';
import getPosition from './get-position.js';

const CLASS_NAME = 'octolinker-link';

let isDiffViewUnified;

function createLinkElement() {
  const linkEl = document.createElement('a');

  linkEl.dataset.pjax = 'true';
  linkEl.classList.add(CLASS_NAME);

  return linkEl;
}

function injectUrl(node, value, startOffset, endOffset) {
  let el;
  try {
    const textMatch = node.textContent.slice(startOffset, endOffset);

    findAndReplaceDOMText(node, {
      find: textMatch,
      replace: portion => {
        if (!portion.text.includes(value)) {
          return portion.text;
        }

        el = createLinkElement();
        el.textContent = portion.text;

        return el;
      },
    });
  } catch (error) {
    console.error(error);
  }

  return el;
}

export default function(blob, regex, plugin, meta = {}) {
  if (!blob) {
    throw new Error('must be called with a blob');
  }

  if (!plugin) {
    throw new Error('must be called with a plugin');
  }

  if (!(regex instanceof RegExp)) {
    throw new Error('must be called with a RegExp');
  }

  const matches = [];

  getPosition(blob.toString(), regex).forEach(
    ({ lineNumber, startPos, endPos, values }) => {
      let urls = plugin.resolve(blob.path, values, meta);
      if (Array.isArray(urls)) {
        urls = urls.filter(Boolean);
      }

      // console.log({ lineNumber, startPos, endPos, values: values[0], regex });

      // - https://github.com/OctoLinker/OctoLinker/pull/686/files
      // - https://github.com/OctoLinker/OctoLinker/blob/master/e2e/fixtures/javascript/index.js
      // - https://github.com/tdeekens/flopflip/pull/792/files#diff-edcad5de0b7e8df749870abcdf269133R1
      // - https://github.com/OctoLinker/OctoLinker/pull/626/files
      // - https://github.com/tdeekens/flopflip/blob/e1d3dbacef446ef3a52d7b9a31613ac552e7217e/packages/launchdarkly-adapter/modules/adapter/adapter.ts#L1
      // - https://github.com/tdeekens/flopflip/blob/bb1b5ce1a3dc1bcf0600069184f3946941620880/packages/react/modules/components/configure-adapter/configure-adapter.tsx
      // - https://github.com/tdeekens/flopflip/pull/667/files
      // - https://github.com/OctoLinker/OctoLinker/blob/master/e2e/fixtures/javascript/package.json

      const lineNumberInBlob = lineNumber + blob.firstLineNumber - 1;

      let el;
      if (blob.isDiff) {
        let lineRootEl = blob.el.querySelector(
          blob.lineSelector(lineNumberInBlob),
        );

        // When line number exsists in both left and right diff
        if (lineRootEl) {
          if (isDiffViewUnified === undefined) {
            isDiffViewUnified =
              lineRootEl.parentElement.childElementCount === 3;
          }

          // TODO make unified diff view working again
          if (isDiffViewUnified && blob.blobType === 'diffLeft') {
            // When diff view is unified, the target element is the third sibling
            lineRootEl = lineRootEl.nextElementSibling;
          }

          lineRootEl = lineRootEl.nextElementSibling;
          el = lineRootEl.querySelector('.blob-code-inner') || lineRootEl;
        }
      } else {
        el = blob.el.querySelector(blob.lineSelector(lineNumberInBlob));
      }

      if (!el) {
        return;
      }

      // Do not wrap already wrapped link
      if (el.querySelector(`.${CLASS_NAME}`)) {
        return;
      }

      // TODO push link el into matches along with the urls prop
      const retEl = injectUrl(el, values[0], startPos, endPos);
      if (retEl) {
        matches.push({
          link: retEl,
          urls,
        });
      }
    },
  );

  return matches;
}
