declare module '@mapbox/polyline' {
  export function decode(str: string, precision?: number): [number, number][];
  export function encode(
    coordinates: [number, number][],
    precision?: number
  ): string;
  const _default: {
    decode: typeof decode;
    encode: typeof encode;
  };
  export default _default;
}
