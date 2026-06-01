const fs = require('fs');
const { parse } = require('csv-parse');

const csvPath = 'C:\\Users\\Ronnie Greenaway\\Downloads\\Document - Form Responses 1.csv';
const fileContent = fs.readFileSync(csvPath);

parse(fileContent, {
  skip_empty_lines: true,
  trim: true,
  bom: true,
}, (err, records) => {
  if (err) {
    console.error(err);
    return;
  }
  const headers = records[0].map(h => h ? h.toLowerCase().trim() : '');
  const row = records[1]; // Jaleayah
  
  const courseIdx = headers.findIndex(h => ['course', 'program'].includes(h));
  const program = (courseIdx !== -1 && row[courseIdx]) ? row[courseIdx] : 'Undeclared';
  
  console.log('courseIdx:', courseIdx);
  console.log('row[courseIdx]:', row[courseIdx]);
  console.log('program:', program);
  console.log('All headers index mapping to "course" or "program":');
  headers.forEach((h, i) => {
    if (['course', 'program'].includes(h)) {
      console.log(`Index ${i}: header="${h}" | value="${row[i]}"`);
    }
  });
  
  process.exit(0);
});
