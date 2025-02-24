// Import createDbWorker sebagai default import
import createDbWorker from "https://cdn.jsdelivr.net/npm/sql.js-httpvfs/dist/sqlite.worker.js";

let worker = null;

async function setupDatabase() {
  try {
    // Konfigurasi untuk mengakses database SQLite
    const workerUrl = new URL(
      "https://cdn.jsdelivr.net/npm/sql.js-httpvfs/dist/sqlite.worker.js",
      import.meta.url
    );
    const wasmUrl = new URL(
      "https://cdn.jsdelivr.net/npm/sql.js-httpvfs/dist/sql-wasm.wasm",
      import.meta.url
    );

    worker = await createDbWorker(
      [
        {
          from: "inline", // Menggunakan file SQLite dari URL
          config: {
            serverMode: "full", // Mode server penuh
            url: "data/db_1.db", // Path ke file database SQLite
            requestChunkSize: 4096, // Ukuran chunk untuk permintaan HTTP
          },
        },
      ],
      workerUrl.toString(),
      wasmUrl.toString()
    );
  } catch (error) {
    console.error("Error setting up database:", error);
    document.getElementById("output").innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function getQuestionsData() {
  try {
    // Query untuk mengambil data dari tabel 'questions'
    const result = await worker.db.exec(
      `SELECT author_nick, subject_name, typename, database_id, content, created, thumbnail_url FROM questions LIMIT 10`
    );

    // Menampilkan hasil query dalam tabel HTML
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = ""; // Bersihkan output sebelumnya

    if (result.length === 0 || result[0].values.length === 0) {
      outputDiv.innerHTML = "<p>Tidak ada data ditemukan.</p>";
      return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // Header tabel
    const headerRow = document.createElement("tr");
    ["author_nick", "subject_name", "typename", "database_id", "content", "created", "thumbnail_url"].forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Isi tabel
    result[0].values.forEach(row => {
      const tr = document.createElement("tr");
      row.forEach(value => {
        const td = document.createElement("td");
        td.textContent = value || "-"; // Tampilkan "-" jika nilai null
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    outputDiv.appendChild(table);
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById("output").innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

// Event listener untuk tombol "Muat Data"
document.getElementById("load-data").addEventListener("click", async () => {
  if (!worker) {
    await setupDatabase(); // Inisialisasi database jika belum dilakukan
  }

  getQuestionsData(); // Ambil data dari tabel 'questions'
});
