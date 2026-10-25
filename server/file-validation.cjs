function validFile(bytes, type) {
  if (!bytes || bytes.length < 12 || bytes.length > 20 * 1024 * 1024) return false;
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (type === 'application/pdf') return ascii(0, 5) === '%PDF-';
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
  if (type === 'image/webp') return ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP';
  return false;
}
module.exports = { validFile };

// Pickers can omit MIME types or report a generic binary type for valid documents.
// Normalize metadata only; callers must still validate the actual signature.
function normalizeFileType(type, name = '') {
  const value = typeof type === 'string' ? type.split(';')[0].trim().toLowerCase() : '';
  if (!value || value === 'application/octet-stream' || value === 'binary/octet-stream') {
    const extension = name.split('.').pop()?.toLowerCase();
    return ({ pdf:'application/pdf', jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp' })[extension] || 'application/octet-stream';
  }
  return ({ 'image/jpg':'image/jpeg', 'application/x-pdf':'application/pdf' })[value] || value;
}
module.exports.normalizeFileType = normalizeFileType;
