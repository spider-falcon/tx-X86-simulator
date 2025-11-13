export const formatHex = (value: number, length = 8) => {
  return `0x${value.toString(16).toUpperCase().padStart(length, '0')}`;
};
