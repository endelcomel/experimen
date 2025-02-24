import "/src/styles.css";
import { createDbWorker } from "sql.js-httpvfs";

const workerUrl = "/src/sqlite.worker.js";
const wasmUrl = "/assets/sql-wasm.wasm";

async function load() {
  console.log("start load");
  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: "db_1.sqlite3",
          requestChunkSize: 4096
        }
      }
    ],
    workerUrl,
    wasmUrl
  );

  console.log("before awaitworkerdb");
  const result = await worker.db.query(`select * from questions`);

  document.getElementById("app").innerHTML = JSON.stringify(result);
}

console.log(load);
load();
