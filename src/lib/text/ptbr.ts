const PT_BR_MARKERS = [
  ' de ',
  ' o ',
  ' a ',
  ' que ',
  ' é ',
  ' um ',
  ' uma ',
  ' para ',
  ' em ',
  ' com ',
  ' você ',
  ' seu ',
  ' sua ',
  ' mais ',
  ' não ',
];

export function looksPtBr(text: string): boolean {
  const padded = ` ${text.toLowerCase()} `;
  return PT_BR_MARKERS.some((marker) => padded.includes(marker));
}
