'use client';

import { useLayoutEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import "./BeamTransparentLogo.css";

const NATIVE_W = 794.585;
const NATIVE_H = 203.876;
/** Native-space pad so dilate(10) + shadow(15) aren't clipped at the edges */
const OUTLINE_PAD = 28;
const STAGE_W = NATIVE_W + OUTLINE_PAD * 2;
const STAGE_H = NATIVE_H + OUTLINE_PAD * 2;

const TW_H = {
  "h-5": 20,
  "h-6": 24,
  "h-7": 28,
  "h-8": 32,
  "h-10": 40,
  "h-12": 48,
};

const LETTER_PATH =
  "M165.366 116.096V138.466C165.366 160.741 159.797 177.259 148.659 188.019C137.522 198.59 122.986 203.876 105.053 203.876C87.1192 203.876 73.2443 197.552 63.4281 184.904V193.399C63.4281 195.475 62.673 197.269 61.1628 198.779C59.6526 200.289 57.8592 201.044 55.7827 201.044H7.64535C5.56883 201.044 3.77548 200.289 2.26529 198.779C0.755096 197.269 4.01706e-07 195.475 4.01706e-07 193.399V7.64535C4.01706e-07 5.56884 0.755096 3.77549 2.26529 2.26529C3.77548 0.755096 5.56883 -1.49387e-06 7.64535 -1.49387e-06H60.0301C62.1066 -1.49387e-06 63.9 0.755096 65.4102 2.26529C66.9204 3.77549 67.6755 5.56884 67.6755 7.64535V64.2775C77.4917 55.4052 90.5171 50.969 106.752 50.969C123.175 50.969 137.05 56.5378 148.376 67.6755C159.703 78.8131 165.366 94.9533 165.366 116.096ZM67.6755 136.767C67.6755 147.716 72.3948 153.19 81.8335 153.19C91.2722 153.19 95.9916 147.716 95.9916 136.767V118.078C95.9916 107.129 91.2722 101.655 81.8335 101.655C72.9611 101.655 68.2418 106.374 67.6755 115.813V136.767ZM338.928 144.129H254.546V145.545C254.546 157.06 258.227 162.818 265.589 162.818C267.666 162.818 270.214 161.307 273.235 158.287C276.255 155.267 279.559 153.756 283.145 153.756H336.663C340.816 153.756 342.892 155.833 342.892 159.986C342.892 169.236 335.908 178.863 321.938 188.868C308.158 198.873 289.375 203.876 265.589 203.876C241.993 203.876 222.643 197.741 207.541 185.47C192.628 173.011 185.172 155.927 185.172 134.218V120.627C185.172 100.05 192.817 83.3437 208.108 70.5071C223.398 57.4817 243.409 50.969 268.138 50.969C293.056 50.969 312.311 58.2368 325.903 72.7724C339.683 87.308 346.573 105.713 346.573 127.989V136.484C346.573 138.56 345.818 140.353 344.308 141.864C342.798 143.374 341.005 144.129 338.928 144.129ZM277.199 107.601C277.199 96.2747 273.424 90.6115 265.873 90.6115C258.322 90.6115 254.546 96.2747 254.546 107.601V108.734H277.199V107.601ZM366.295 158.853C366.295 133.369 386.966 117.04 428.307 109.866L458.322 105.053C458.322 99.3895 457.851 95.614 456.907 93.7263C455.963 91.6498 453.698 90.6115 450.111 90.6115C446.713 90.6115 443.315 92.1217 439.917 95.1421C436.519 98.1625 433.31 99.6726 430.29 99.6726H382.152C377.999 99.6726 375.923 97.6905 375.923 93.7263C375.923 89.5732 377.338 85.2314 380.17 80.7009C383.19 75.9815 387.438 71.3566 392.912 66.826C398.576 62.2954 406.41 58.5199 416.415 55.4995C426.608 52.4792 437.935 50.969 450.394 50.969C475.69 50.969 494.661 56.2546 507.309 66.826C519.957 77.3973 526.281 92.4992 526.281 112.132V193.399C526.281 195.475 525.526 197.269 524.016 198.779C522.506 200.289 520.712 201.044 518.636 201.044H469.083C467.006 201.044 465.213 200.289 463.703 198.779C462.192 197.269 461.437 195.475 461.437 193.399V185.47C452.565 197.741 439.634 203.876 422.644 203.876C405.655 203.876 391.968 199.628 381.586 191.134C371.392 182.45 366.295 171.69 366.295 158.853ZM440.767 161.968C453.037 161.968 459.172 154.606 459.172 139.882L442.465 143.563C434.159 145.45 430.006 148.943 430.006 154.04C430.006 156.305 430.95 158.193 432.838 159.703C434.726 161.213 437.369 161.968 440.767 161.968ZM718.132 101.655C715.111 101.655 712.468 102.787 710.203 105.053C708.127 107.318 707.088 110.716 707.088 115.247V193.399C707.088 195.475 706.333 197.269 704.823 198.779C703.313 200.289 701.519 201.044 699.443 201.044H649.607C647.53 201.044 645.737 200.289 644.227 198.779C642.716 197.269 641.961 195.475 641.961 193.399V117.229C641.961 106.846 638.186 101.655 630.635 101.655C627.426 101.655 624.688 102.882 622.423 105.336C620.347 107.601 619.308 110.81 619.308 114.963V193.399C619.308 195.475 618.553 197.269 617.043 198.779C615.533 200.289 613.74 201.044 611.663 201.044H560.694C558.618 201.044 556.824 200.289 555.314 198.779C553.804 197.269 553.049 195.475 553.049 193.399V61.4459C553.049 59.3694 553.804 57.5761 555.314 56.0659C556.824 54.5557 558.618 53.8006 560.694 53.8006H607.416C609.492 53.8006 611.285 54.5557 612.796 56.0659C614.306 57.5761 615.061 59.3694 615.061 61.4459V70.7902C618.836 65.8821 624.216 61.4459 631.201 57.4817C638.941 53.1399 647.624 50.969 657.252 50.969C678.017 50.969 691.986 58.7087 699.16 74.1882C703.69 67.5811 709.92 62.1066 717.848 57.7648C725.777 53.2343 733.989 50.969 742.483 50.969C757.774 50.969 770.233 56.349 779.861 67.1091C789.677 77.8693 794.585 93.915 794.585 115.247V193.399C794.585 195.475 793.83 197.269 792.32 198.779C790.809 200.289 789.016 201.044 786.94 201.044H737.103C735.027 201.044 733.233 200.289 731.723 198.779C730.213 197.269 729.458 195.475 729.458 193.399V117.229C729.458 106.846 725.682 101.655 718.132 101.655Z";

function glyphHeightHint(className) {
  const s = String(className);
  const arbitrary = s.match(/(?:^|\s)h-\[(\d+(?:\.\d+)?)px\](?:\s|$)/);
  if (arbitrary) return Number(arbitrary[1]);
  const token = s.match(/(?:^|\s)(h-(?:5|6|7|8|10|12))(?:\s|$)/);
  if (token) return TW_H[token[1]];
  return null;
}

/**
 * Transparent "beam" wordmark (hollow letters + animated light sweep).
 * Extracted from beam.html — replaces /logotransparent.png overlays.
 */
export default function BeamTransparentLogo({ className = "", alt = "Beam" }) {
  const filterId = useId().replace(/:/g, "");
  const rootRef = useRef(null);
  const hint = glyphHeightHint(className);
  const [scale, setScale] = useState(hint ? hint / NATIVE_H : 0.15);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      // Tailwind h-* is the intended *glyph* height (pre-pad). We expand the
      // box so outline/shadow on left of "b" / right of "m" stay in-bounds.
      // Also cap to the parent width so the wordmark can sit between controls
      // on narrow phones instead of overlapping them.
      const glyphH =
        hint ||
        el.clientHeight ||
        el.offsetHeight ||
        el.getBoundingClientRect().height;
      const parentW = el.parentElement?.clientWidth ?? 0;
      const scaleH = glyphH > 0 ? glyphH / NATIVE_H : 0;
      const scaleW = parentW > 0 ? parentW / STAGE_W : scaleH;
      const next = Math.min(scaleH || scaleW, scaleW || scaleH);
      if (!(next > 0)) return;

      setScale(next);
      el.style.width = `${STAGE_W * next}px`;
      el.style.height = `${STAGE_H * next}px`;
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [hint]);

  return (
    <div
      ref={rootRef}
      className={clsx("btl", className)}
      style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
      role="img"
      aria-label={alt}
    >
      <div
        className="btl__stage"
        style={{ transform: `scale(${scale})` }}
        aria-hidden="true"
      >
        <div className="btl__logo">
          <div className="btl__beam-clip">
            <div className="btl__beam-wrap">
              <div className="btl__beam" />
            </div>
          </div>

          <svg
            className="btl__outline"
            viewBox={`${-OUTLINE_PAD} ${-OUTLINE_PAD} ${STAGE_W} ${STAGE_H}`}
            xmlns="http://www.w3.org/2000/svg"
            overflow="visible"
          >
            <defs>
              <filter
                id={`thick-outline-${filterId}`}
                filterUnits="userSpaceOnUse"
                x={-OUTLINE_PAD}
                y={-OUTLINE_PAD}
                width={STAGE_W}
                height={STAGE_H}
                colorInterpolationFilters="sRGB"
              >
                <feMorphology
                  in="SourceAlpha"
                  operator="dilate"
                  radius="10"
                  result="dilated"
                />
                <feComposite
                  in="dilated"
                  in2="SourceAlpha"
                  operator="out"
                  result="ring"
                />
                <feFlood floodColor="#030222" result="paint" />
                <feComposite
                  in="paint"
                  in2="ring"
                  operator="in"
                  result="outline"
                />
                <feOffset in="dilated" dx="15" dy="15" result="shadow-offset" />
                <feMorphology
                  in="dilated"
                  operator="erode"
                  radius="3"
                  result="clip-mask"
                />
                <feComposite
                  in="shadow-offset"
                  in2="clip-mask"
                  operator="out"
                  result="shadow-clipped"
                />
                <feFlood floodColor="#030222" result="shadow-color" />
                <feComposite
                  in="shadow-color"
                  in2="shadow-clipped"
                  operator="in"
                  result="shadow"
                />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="outline" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={LETTER_PATH}
              fill="#000"
              filter={`url(#thick-outline-${filterId})`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
