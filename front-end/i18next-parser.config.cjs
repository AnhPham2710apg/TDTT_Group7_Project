module.exports = {
  defaultNamespace: 'translation',
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
    js: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
  },
  locales: ['vi', 'en'], // Các ngôn ngữ bạn muốn tạo
  output: 'src/locales/$LOCALE.json', // Đường dẫn file output
  input: ['src/**/*.{ts,tsx}'], // Nơi quét code
  keepRemoved: true, // Giữ lại key cũ nếu lỡ xóa trong code (an toàn)
  createOldCatalogs: false,
  sort: true, // Sắp xếp key theo bảng chữ cái cho dễ nhìn
};