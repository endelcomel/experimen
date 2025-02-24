// Import createDbWorker dari CDN sql.js-httpvfs
import { createDbWorker } from "https://cdn.jsdelivr.net/npm/sql.js-httpvfs/dist/sqlite.worker.js";

async function setup() {
  try {
    // Konfigurasi untuk mengakses database SQLite
    const worker = await createDbWorker(
      [
        {
          from: "inline", // Menggunakan file SQLite dari URL
          config: {
            serverMode: "full", // Mode server penuh
            url: "data/db_1.db", // Path relatif ke file database SQLite
            requestChunkSize: 4096, // Ukuran chunk untuk permintaan HTTP
          },
        },
      ],
      new URL("https://cdn.jsdelivr.net/npm/sql.js-httpvfs/dist/sqlite.worker.js"),
      new URL("assets/sql-wasm.wasm") // Path ke file WASM
    );

    // Query untuk mengambil data dari tabel 'questions'
    const result = await worker.db.query(`
      SELECT author_nick, subject_name, typename, database_id, content, created, thumbnail_url
      FROM questions
      LIMIT 10
    `);

    // Menampilkan hasil query dalam tabel HTML
    const outputDiv = document.getElementById("output");
    if (result.length === 0) {
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
    result.forEach(row => {
      const tr = document.createElement("tr");
      Object.values(row).forEach(value => {
        const td = document.createElement("td");
        td.textContent = value || "-"; // Tampilkan "-" jika nilai null
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    outputDiv.appendChild(table);
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("output").innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

// Jalankan fungsi setup saat halaman dimuat
setup();
