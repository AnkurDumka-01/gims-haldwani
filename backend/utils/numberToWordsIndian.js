const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
const TEENS = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function twoDigitWords(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ' ' + ONES[ones] : '');
}

function groupWords(n) {
  if (n === 0) return '';
  let words = '';
  if (n >= 100) {
    words += ONES[Math.floor(n / 100)] + ' HUNDRED ';
    n %= 100;
  }
  if (n > 0) words += twoDigitWords(n);
  return words.trim();
}

// Converts a whole-rupee amount into words using the Indian Crore/Lakh numbering system.
function numberToWordsIndian(amount) {
  let num = Math.round(amount);
  if (num === 0) return 'ZERO';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  const parts = [];
  if (crore) parts.push(`${groupWords(crore)} CRORE`);
  if (lakh) parts.push(`${groupWords(lakh)} LAKH`);
  if (thousand) parts.push(`${groupWords(thousand)} THOUSAND`);
  if (remainder) parts.push(groupWords(remainder));

  return parts.join(' ').trim();
}

module.exports = numberToWordsIndian;
