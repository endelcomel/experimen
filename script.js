document.addEventListener('DOMContentLoaded', async () => {
    const output = document.getElementById('output');

    // Dapatkan database_id dari URL
    const databaseId = getUrlParameter('id');
    if (!databaseId) {
        output.textContent = 'Error: Missing "id" parameter in URL.';
        return;
    }

    // Hitung partNumber berdasarkan rentang database_id
    const chunkSize = 25373; // Ukuran setiap bagian
    const partNumber = Math.ceil(databaseId / chunkSize);
    console.log(`Database ID: ${databaseId}, Part Number: ${partNumber}`);

    // Tentukan file database
    const databaseFile = `db/db_${partNumber}.db`;
    console.log(`Attempting to load database file: ${databaseFile}`);

    try {
        // Muat library SQL.js HTTP-VFS
        const SQL = await initSqlJs({
            locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/${file}`
        });

        // Unduh file SQLite dari GitHub Pages
        const response = await fetch(databaseFile);
        if (!response.ok) {
            throw new Error(`Failed to load database file: ${databaseFile}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const db = new SQL.Database(new Uint8Array(arrayBuffer));

        // Jalankan query SQL berdasarkan database_id
        const query = `
            SELECT * FROM questions
            WHERE database_id = ${parseInt(databaseId, 10)}
        `;
        const result = db.exec(query);

        // Tampilkan hasil dalam format JSON
        if (result.length > 0 && result[0].values.length > 0) {
            output.textContent = JSON.stringify(result[0].values, null, 2);
        } else {
            output.textContent = 'No data found for the given database_id.';
        }
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
    }
});
