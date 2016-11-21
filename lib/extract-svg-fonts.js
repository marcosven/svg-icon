/*
 * a WebFonts(SVGFonts) parser
 * input is content of a typical WebFonts file (check out ../spec/fixtures/web-fonts)
 * output is a js object of SVG icons info (SVG by unicode)
 */
const XMLLite = require('xml-lite');
const lang = require('zero-lang');
const trimSVG = require('./trim-svg');

module.exports = (svgFonts, callback) => {
  const icons = [];

  // dom
  const svgFontsDom = XMLLite.parse(svgFonts);
  const fontObj = XMLLite.dom2js(XMLLite.findNode(svgFontsDom, {
    tagName: 'font',
  }));
  const glyphObjs = [];

  function addIcon(svg, extraInfo) {
    const meta = {};
    lang.extend(meta, extraInfo);
    if (svg) {
      const doc = XMLLite.parse(svg).documentElement;
      meta.viewBox = doc.getAttribute('viewBox');
      meta.pathData = XMLLite.getInnerXML(doc);
    }
    icons.push(meta);
  }

  function processNext() {
    // FIXME assume that these glyphs are simple, which contains only paths
    if (glyphObjs.length) {
      const glyphObj = glyphObjs.shift();
      const attrs = glyphObj.attributes;
      const svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(1, -1)">
    <path d="${attrs.d}"/>
  </g>
</svg>`;
      const extraInfo = {};
      if (attrs.unicode) {
        extraInfo.unicode = attrs.unicode;
      }
      if (attrs['glyph-name']) {
        extraInfo.name = attrs['glyph-name'];
      }
      if (glyphObj.tag === 'missing-glyph') {
        extraInfo.missing = true;
      }
      trimSVG(svg, (trimmedSvg) => {
        addIcon(trimmedSvg, extraInfo);
        processNext();
      });
    } else {
      callback(icons);
    }
  }

  lang.each(fontObj.children, (child) => {
    const attrs = child.attributes;
    if (attrs && attrs.d) {
      glyphObjs.push(child);
    }
  });
  processNext();
};