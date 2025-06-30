document.querySelector(".calculate-btn").addEventListener("click", () => {
  const resultContainer = document.getElementById("result-container");
  resultContainer.innerHTML = "";

  const startYear = parseInt(document.querySelector("input[placeholder='연도']").value);
  const startAge = parseInt(document.querySelector("input[placeholder='나이']").value);

  const assetInputs = document.querySelectorAll(".section[data-section='assets'] .input-row");
  const assets = [];
  assetInputs.forEach(row => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length < 3) return;
    const amount = parseRaw(inputs[1]);
    const rate = parseFloat(inputs[2].dataset.raw || "0");
    assets.push({ amount, rate });
  });

  const futureInputs = document.querySelectorAll(".section[data-section='future-assets'] .input-row");
  const futureAssets = [];
  futureInputs.forEach(row => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length < 3) return;
    const amount = parseRaw(inputs[1]);
    const yyyymm = inputs[2].dataset.raw;
    if (yyyymm) {
      const year = parseInt(yyyymm.slice(0, 4));
      futureAssets.push({ amount, year });
    }
  });

  const incomeInputs = document.querySelectorAll(".section[data-section='income'] .input-row");
  const incomeList = [];
  incomeInputs.forEach(row => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length < 4) return;
    const amount = parseRaw(inputs[1]);
    const start = inputs[2].dataset.raw;
    const end = inputs[3].dataset.raw;
    if (start && end) {
      incomeList.push({ amount, start, end });
    }
  });

  const livingCostInput = document.querySelector("input[placeholder='월 생활비(원)']");
  const initialLivingCost = parseRaw(livingCostInput);

  const inflationInput = document.querySelector("input[placeholder='소비자물가상승률(%)']");
  const inflation = parseFloat(inflationInput.dataset.raw || "0") / 100;

  const table = document.createElement("div");
  table.className = "result-table";
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>연도</th>
          <th>나이</th>
          <th title="당해 총 수입/12">월 평균수입</th>
          <th>연 수입</th>
          <th title="물가 상승 고려">월 지출</th>
          <th>연 지출</th>
          <th>연말 잔액</th>
        </tr>
      </thead>
      <tbody></tbody>
      <style>
        .deficit {
          background-color: #ffe5e5 !important;
        }
      </style>
    </table>
  `;
  resultContainer.appendChild(table);

// 저장하기 버튼 생성
const saveBtn = document.createElement("button");
saveBtn.textContent = "저장하기";
saveBtn.className = "save-btn";
saveBtn.style.marginTop = "24px";
saveBtn.style.display = "block";
saveBtn.style.marginLeft = "auto";
saveBtn.style.marginRight = "auto";
saveBtn.onclick = () => {
  const captureArea = document.querySelector(".container");
  html2canvas(captureArea, {
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: captureArea.scrollWidth,   // 캡처 영역의 실제 너비
    windowHeight: captureArea.scrollHeight,  // 캡처 영역의 실제 높이
    backgroundColor: "#ffffff", // 하얀색 배경 설정
    scale: 2 // 해상도 2배로 렌더링
  }).then(canvas => {
  const link = document.createElement("a");
  link.download = "result.png";
  link.href = canvas.toDataURL();
  link.click();
  });
};
resultContainer.appendChild(saveBtn);

  const tbody = table.querySelector("tbody");

  let year = startYear;
  let age = startAge;
  const maxAge = 100;
  let balance = assets.reduce((sum, a) => sum + a.amount, 0);
  let livingCost = initialLivingCost;

  while (age <= maxAge) {
    let annualIncome = 0;
    incomeList.forEach(inc => {
      const start = parseInt(inc.start.slice(0, 6));
      const end = parseInt(inc.end.slice(0, 6));
      const current = parseInt(`${year}01`);
      const currentEnd = parseInt(`${year}12`);
      if (start <= currentEnd && end >= current) {
        let months = 12;
        if (year === parseInt(inc.start.slice(0, 4))) {
          months -= parseInt(inc.start.slice(4, 6)) - 1;
        }
        if (year === parseInt(inc.end.slice(0, 4))) {
          months = Math.min(months, parseInt(inc.end.slice(4, 6)));
        }
        annualIncome += inc.amount * months;
      }
    });

    const maturedAssets = futureAssets
      .filter(f => f.year === year)
      .reduce((sum, f) => sum + f.amount, 0);

    const annualExpense = Math.floor(livingCost * 12);

    balance += annualIncome + maturedAssets - annualExpense;

    // 자산 수익률은 balance 중 자산+미래자산으로 구성된 원금에만 적용
    if (year > startYear && balance > 0) {
      const totalInitial = assets.reduce((sum, a) => sum + a.amount, 0);
      const totalRate = assets.length > 0
        ? assets.reduce((sum, a) => sum + a.amount * (a.rate / 100), 0) / totalInitial
        : 0;
      balance = Math.floor(balance * (1 + totalRate));
    }

    if (balance <= 0) {
      const row = document.createElement("tr");
      row.className = "deficit";
      row.innerHTML = `
        <td>${year}</td>
        <td>${age}</td>
        <td>${Math.floor(annualIncome / 12).toLocaleString()}</td>
        <td>${annualIncome.toLocaleString()}</td>
        <td>${Math.floor(livingCost).toLocaleString()}</td>
        <td>${annualExpense.toLocaleString()}</td>
        <td>${balance.toLocaleString()}</td>
      `;
      tbody.appendChild(row);
      break;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${year}</td>
      <td>${age}</td>
      <td>${Math.floor(annualIncome / 12).toLocaleString()}</td>
      <td>${annualIncome.toLocaleString()}</td>
      <td>${Math.floor(livingCost).toLocaleString()}</td>
      <td>${annualExpense.toLocaleString()}</td>
      <td>${balance.toLocaleString()}</td>
    `;
    tbody.appendChild(row);

    year++;
    age++;
    livingCost *= 1 + inflation;
  }
});

function parseRaw(input) {
  const raw = input.dataset.raw;
  return raw ? parseFloat(raw.replace(/,/g, "")) : 0;
}
