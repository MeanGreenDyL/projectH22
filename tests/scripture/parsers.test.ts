/** Parser behavior on small synthetic snippets of each upstream format. */
import { describe, expect, it } from 'vitest';
import { parseOsis, parseSaorsaBook, parseUsfx, parseZefania } from '../../scripts/scripture/parsers';

describe('parseUsfx', () => {
  const xml = `<usfx><book id="FRT"><p>front matter</p></book><book id="PSA"><id id="PSA">x</id><h>Psalms</h>
    <p sfm="mt">Psalms</p><c id="3"/><s>Heading</s><p sfm="r">(2 Samuel 15)</p><d>A Psalm of David.</d>
    <q><v id="1"/><w s="H3068">LORD</w>, how<f caller="+">note text</f> are they &amp; increased!<ve/></q>
    <q><v id="2"/>Many say<x caller="-">Ps 4</x> of me.<ve/></q></book></usfx>`;
  const [book] = parseUsfx(xml);
  it('keeps verse text, drops notes, cross-references, headings and front matter', () => {
    expect(book!.code).toBe('PSA');
    expect(book!.chapters[0]!.verses).toEqual([[1, 'LORD, how are they & increased!'], [2, 'Many say of me.']]);
  });
  it('keeps the unnumbered superscription as the chapter title', () => {
    expect(book!.chapters[0]!.title).toBe('A Psalm of David.');
  });
});

describe('parseOsis', () => {
  const xml = `<osis><div type="book" osisID="Ps"><chapter osisRef="Ps.3" sID="a"/>
    <title type="psalm" canonical="true">A Psalm of David.</title><title>Section</title>
    <verse osisID="Ps.3.1" sID="b"/>LORD, how <transChange type="added">are</transChange> they<note>n</note> increased!<verse eID="b"/>
    <chapter eID="a"/></div></osis>`;
  it('keeps added words and the psalm title, drops notes and section titles', () => {
    const [book] = parseOsis(xml);
    expect(book!.chapters[0]).toEqual({ chapter: 3, title: 'A Psalm of David.', verses: [[1, 'LORD, how are they increased!']] });
  });
});

describe('parseZefania', () => {
  it('maps book numbers onto the 66-book order', () => {
    const xml = `<XMLBIBLE><BIBLEBOOK bnumber="35" bname="Habakkuk"><CHAPTER cnumber="2"><VERS vnumber="2">Write the vision<NOTE>n</NOTE>.</VERS></CHAPTER></BIBLEBOOK></XMLBIBLE>`;
    const [book] = parseZefania(xml);
    expect(book).toEqual({ code: 'HAB', name: 'Habakkuk', chapters: [{ chapter: 2, verses: [[2, 'Write the vision.']] }] });
  });
});

describe('parseSaorsaBook', () => {
  it('resolves dataset book names through registry aliases', () => {
    const json = JSON.stringify({ book: 'Ecclesiasticus', chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'All wisedome commeth from the Lord' }] }] });
    expect(parseSaorsaBook(json).code).toBe('SIR');
  });
});
