const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// Folder tempat database disimpan
const DATABASE_FOLDER = path.join(__dirname, 'public');

// Cache untuk menyimpan file database yang sudah didekompresi
const decompressedCache = {};

// Fungsi untuk mendapatkan daftar file database secara otomatis
function getDatabaseFiles() {
    try {
        // Baca isi folder dan filter hanya file dengan ekstensi .sqlite3.gz
        const files = fs.readdirSync(DATABASE_FOLDER);
        return files
            .filter(file => file.endsWith('.gz'))
            .map(file => path.join(DATABASE_FOLDER, file));
    } catch (err) {
        console.error('Error reading database folder:', err.message);
        return [];
    }
}

// Fungsi untuk mendekompresi file gzip
function decompressFile(filePath, callback) {
    if (decompressedCache[filePath]) {
        // Jika file sudah didekompresi, gunakan cache
        return callback(null, decompressedCache[filePath]);
    }

    const gzip = zlib.createGunzip();
    const input = fs.createReadStream(filePath);
    const output = [];

    input.pipe(gzip)
        .on('data', (chunk) => {
            output.push(chunk);
        })
        .on('end', () => {
            const decompressedData = Buffer.concat(output);
            decompressedCache[filePath] = decompressedData; // Simpan ke cache
            callback(null, decompressedData);
        })
        .on('error', (err) => {
            console.error(`Error decompressing file ${filePath}:`, err.message);
            callback(err);
        });
}

// Fungsi untuk menemukan database berdasarkan database_id
function findDatabaseByDatabaseId(databaseId, callback) {
    const databases = getDatabaseFiles(); // Ambil daftar database secara otomatis
    let foundDatabase = null;

    if (databases.length === 0) {
        return callback(null); // Tidak ada database yang ditemukan
    }

    // Iterasi melalui setiap database
    databases.forEach((dbPath, index) => {
        decompressFile(dbPath, (err, decompressedData) => {
            if (err) {
                console.error(`Error decompressing database ${dbPath}:`, err.message);
                return;
            }

            // Simpan file sementara untuk dibuka oleh sqlite3
            const tempFilePath = `${dbPath}.tmp`;
            fs.writeFileSync(tempFilePath, decompressedData);

            // Buka database yang didekompresi
            const db = new sqlite3.Database(tempFilePath, (err) => {
                if (err) {
                    console.error(`Error opening database ${tempFilePath}:`, err.message);
                    fs.unlinkSync(tempFilePath); // Hapus file sementara jika gagal
                    return;
                }

                // Query untuk memeriksa keberadaan database_id
                const query = 'SELECT COUNT(*) AS count FROM questions WHERE database_id = ?';
                db.get(query, [databaseId], (err, row) => {
                    if (err) {
                        console.error(`Error executing query on database ${tempFilePath}:`, err.message);
                        db.close(() => fs.unlinkSync(tempFilePath)); // Hapus file sementara
                        return;
                    }

                    // Jika database_id ditemukan, simpan path database
                    if (row && row.count > 0) {
                        foundDatabase = tempFilePath;
                    }

                    // Tutup koneksi database dan hapus file sementara
                    db.close(() => {
                        if (!foundDatabase) {
                            fs.unlinkSync(tempFilePath); // Hapus file sementara jika tidak diperlukan
                        }
                    });

                    // Jika ini iterasi terakhir atau database ditemukan, panggil callback
                    if (index === databases.length - 1 || foundDatabase) {
                        callback(foundDatabase);
                    }
                });
            });
        });
    });
}

// Endpoint GET untuk mengakses data berdasarkan database_id
app.get('/:database_id', (req, res) => {
    const databaseId = req.params.database_id;

    // Cari database yang mengandung database_id
    findDatabaseByDatabaseId(databaseId, (foundDatabase) => {
        if (!foundDatabase) {
            return res.status(404).json({ error: 'Database ID not found in any database' });
        }

        // Buka koneksi ke database yang ditemukan
        const db = new sqlite3.Database(foundDatabase, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                return res.status(500).json({ error: 'Database connection error' });
            }
        });

        // Query data dari tabel 'questions'
        const query = 'SELECT * FROM questions WHERE database_id = ?';
        db.get(query, [databaseId], (err, row) => {
            if (err) {
                console.error('Error executing query:', err.message);
                return res.status(500).json({ error: 'Query execution error' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Data not found' });
            }

            // Kirim hasil query sebagai respons JSON
            res.json(row);

            // Tutup koneksi database dan hapus file sementara
            db.close(() => fs.unlinkSync(foundDatabase));
        });
    });
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
