// Fungsi untuk mendapatkan parameter dari URL
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

document.addEventListener('DOMContentLoaded', async () => {
    const output = document.getElementById('output');

    // Dapatkan database_id dari URL
    const databaseId = getUrlParameter('id');
    if (!databaseId) {
        output.textContent = 'Error: Missing "id" parameter in URL.';
        return;
    }

    // Tentukan file database berdasarkan database_id
    const partNumber = Math.ceil(databaseId / 25373); // Sesuaikan dengan chunk size Anda
    const databaseFile = `db/db_${partNumber}.db`;

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
        output.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
    }
});
