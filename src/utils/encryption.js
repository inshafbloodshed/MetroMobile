import { DIGIT_TO_LETTER, LETTER_TO_DIGIT } from './constants';

export function encryptCost(cost) {
  return String(Math.round(cost))
    .split('')
    .map(d => DIGIT_TO_LETTER[d] ?? d)
    .join('');
}

export function decryptCost(enc) {
  return enc.split('').map(c => LETTER_TO_DIGIT[c] ?? c).join('');
}

export function encryptText(text, shift = 3) {
  return text
    .split('')
    .map(char => {
      if (char.match(/[a-z]/i)) {
        const code = char.charCodeAt(0);
        const base = code >= 65 && code <= 90 ? 65 : 97;
        return String.fromCharCode(((code - base + shift) % 26) + base);
      }
      return char;
    })
    .join('');
}

export function decryptText(encrypted, shift = 3) {
  return encryptText(encrypted, 26 - shift);
}

export function generateHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase();
} 