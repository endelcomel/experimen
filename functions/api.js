const express = require('express');
const serverless = require('serverless-http');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_FOLDER = path.join(__dirname, '../public');
const decompressedCache = {};

// Mendapatkan daftar file database .gz
function getDatabaseFiles() {
    try {
        return fs.readdirSync(DATABASE_FOLDER)
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
        return callback(null, decompressedCache[filePath]);
    }

    const gzip = zlib.createGunzip();
    const input = fs.createReadStream(filePath);
    const output = [];

    input.pipe(gzip)
        .on('data', chunk => output.push(chunk))
        .on('end', () => {
            const decompressedData = Buffer.concat(output);
            decompressedCache[filePath] = decompressedData;
            callback(null, decompressedData);
        })
        .on('error', err => {
            console.error(`Error decompressing file ${filePath}:`, err.message);
            callback(err);
        });
}

// Mencari database berdasarkan database_id
function findDatabaseByDatabaseId(databaseId, callback) {
    const databases = getDatabaseFiles();
    let foundDatabase = null;

    if (databases.length === 0) return callback(null);

    databases.forEach((dbPath, index) => {
        decompressFile(dbPath, (err, decompressedData) => {
            if (err) return;

            const tempFilePath = `${dbPath}.tmp`;
            fs.writeFileSync(tempFilePath, decompressedData);

            const db = new sqlite3.Database(tempFilePath, err => {
                if (err) {
                    fs.unlinkSync(tempFilePath);
                    return;
                }

                db.get('SELECT COUNT(*) AS count FROM questions WHERE database_id = ?', [databaseId], (err, row) => {
                    if (err) {
                        db.close(() => fs.unlinkSync(tempFilePath));
                        return;
                    }

                    if (row && row.count > 0) {
                        foundDatabase = tempFilePath;
                    }

                    db.close(() => {
                        if (!foundDatabase) fs.unlinkSync(tempFilePath);
                    });

                    if (index === databases.length - 1 || foundDatabase) callback(foundDatabase);
                });
            });
        });
    });
}

// Endpoint untuk mendapatkan data berdasarkan database_id
app.get('/api/:database_id', (req, res) => {
    const databaseId = req.params.database_id;

    findDatabaseByDatabaseId(databaseId, foundDatabase => {
        if (!foundDatabase) {
            return res.status(404).json({ error: 'Database ID not found' });
        }

        const db = new sqlite3.Database(foundDatabase, err => {
            if (err) {
                return res.status(500).json({ error: 'Database connection error' });
            }
        });

        db.get('SELECT * FROM questions WHERE database_id = ?', [databaseId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Query execution error' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Data not found' });
            }

            res.json(row);
            db.close(() => fs.unlinkSync(foundDatabase));
        });
    });
});

module.exports.handler = serverless(app);
