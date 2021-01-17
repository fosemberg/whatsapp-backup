const { execSync } = require("child_process");
const puppeteer = require('puppeteer');
const path = require('path');

const distPath = path.join('..', 'data', 'output');
const webPath = path.join(distPath, 'web')
const pdfPath = path.join(distPath, 'pdf')

const yearsStdout = execSync(`ls ${webPath}`).toString();
console.log(yearsStdout)
const years = yearsStdout.split('\n')
years.pop()
console.log(years)

const scales = [
  0.5,
  1,
  1.5,
  2,
]

for (const scale of scales) {
  const pdfScalePath = path.join(pdfPath, `scale${scale}`)
  execSync(`mkdir -p ${pdfScalePath}`);
  for (const year of years) {
    execSync(`mkdir -p ${path.join(pdfScalePath, year)}`);
  }
}

const webChatPathsStdout = execSync(`find ${webPath} -mindepth 2 -type d`).toString();
const webChatPaths = webChatPathsStdout.split('\n')
webChatPaths.pop();
// console.log(webChatPaths)

const chatPaths = scales.flatMap((scale => (
  webChatPaths.map(webChatPath => ({
    http: webChatPath.replace(webPath, 'http://localhost:8080'),
    pdf: `${webChatPath.replace(webPath, path.join(pdfPath, `scale${scale}`))}.pdf`,
    scale,
  }))
)));

console.log(chatPaths);

(async () => {
  const browser = await puppeteer.launch({
    // args: [
    //   '--disable-gpu',
    //   '--disable-dev-shm-usage',
    //   '--disable-setuid-sandbox',
    //   '--no-first-run',
    //   '--no-sandbox',
    //   '--no-zygote',
    //   '--single-process',
    // ]
  })
  const page = await browser.newPage();

  for (let chatPath of chatPaths) {
    console.log(chatPath)
    console.log(chatPath.http)
    await page.goto(
      chatPath.http,
      {"waitUntil" : "networkidle0"}
    );
    await page.pdf({
      scale: chatPath.scale,
      path: chatPath.pdf,
      printBackground: true,
      displayHeaderFooter: true,
    });
  }

  await browser.close();
})();
