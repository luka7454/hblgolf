// server.js - HBL 골프 클럽 백엔드 API 서버

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 정적 파일 서빙

// 데이터베이스 연결
const dbPath = path.join(__dirname, 'hbl_golf.db');
const db = new sqlite3.Database(dbPath);

// 데이터베이스 초기화 (처음 실행 시)
function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('데이터베이스 초기화 오류:', err.message);
            } else {
                console.log('데이터베이스가 초기화되었습니다.');
            }
        });
    }
}

// API 라우트

// 1. 선수 관련 API
app.get('/api/players', (req, res) => {
    const query = `
        SELECT p.*, 
               AVG(s.total_score) as avg_score,
               MIN(s.total_score) as best_score,
               COUNT(CASE WHEN s.ranking = 1 THEN 1 END) as wins,
               COUNT(CASE WHEN s.ranking <= 3 THEN 1 END) as top3
        FROM players p
        LEFT JOIN scores s ON p.id = s.player_id
        GROUP BY p.id
        ORDER BY avg_score ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/players/:id', (req, res) => {
    const playerId = req.params.id;
    const query = `
        SELECT p.*,
               AVG(s.total_score) as avg_score,
               MIN(s.total_score) as best_score,
               COUNT(CASE WHEN s.ranking = 1 THEN 1 END) as wins,
               COUNT(CASE WHEN s.ranking <= 3 THEN 1 END) as top3
        FROM players p
        LEFT JOIN scores s ON p.id = s.player_id
        WHERE p.id = ?
        GROUP BY p.id
    `;
    
    db.get(query, [playerId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: '선수를 찾을 수 없습니다.' });
            return;
        }
        res.json(row);
    });
});

// 2. 라운딩 관련 API
app.get('/api/rounds', (req, res) => {
    const query = `
        SELECT r.*, gc.name as course_name, gc.location,
               (SELECT p.name FROM players p 
                JOIN scores s ON p.id = s.player_id 
                WHERE s.round_id = r.id AND s.ranking = 1 LIMIT 1) as winner_name,
               (SELECT s.total_score FROM scores s 
                WHERE s.round_id = r.id AND s.ranking = 1 LIMIT 1) as winner_score
        FROM rounds r
        LEFT JOIN golf_courses gc ON r.course_id = gc.id
        ORDER BY r.round_date DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/rounds/:id', (req, res) => {
    const roundId = req.params.id;
    const query = `
        SELECT r.*, gc.name as course_name, gc.location
        FROM rounds r
        LEFT JOIN golf_courses gc ON r.course_id = gc.id
        WHERE r.id = ?
    `;
    
    db.get(query, [roundId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: '라운딩을 찾을 수 없습니다.' });
            return;
        }
        res.json(row);
    });
});

// 3. 스코어 관련 API
app.get('/api/rounds/:id/scores', (req, res) => {
    const roundId = req.params.id;
    const query = `
        SELECT s.*, p.name, p.photo_url
        FROM scores s
        JOIN players p ON s.player_id = p.id
        WHERE s.round_id = ?
        ORDER BY s.ranking ASC
    `;
    
    db.all(query, [roundId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 4. 라운딩 통계 API
app.get('/api/rounds/:id/stats', (req, res) => {
    const roundId = req.params.id;
    const query = `
        SELECT 
            COUNT(*) as participant_count,
            AVG(total_score) as avg_score,
            MIN(total_score) as best_score,
            MAX(total_score) as worst_score
        FROM scores
        WHERE round_id = ?
    `;
    
    db.get(query, [roundId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// 5. 뉴스 피드 API
app.get('/api/news', (req, res) => {
    const query = `
        SELECT nf.*, r.round_name, gc.name as course_name
        FROM news_feeds nf
        LEFT JOIN rounds r ON nf.round_id = r.id
        LEFT JOIN golf_courses gc ON r.course_id = gc.id
        ORDER BY nf.created_at DESC
        LIMIT 10
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 6. 전체 랭킹 API
app.get('/api/rankings', (req, res) => {
    const query = `
        SELECT p.*, 
               AVG(s.total_score) as avg_score,
               MIN(s.total_score) as best_score,
               COUNT(CASE WHEN s.ranking = 1 THEN 1 END) as wins,
               COUNT(CASE WHEN s.ranking <= 3 THEN 1 END) as top3,
               COUNT(s.id) as rounds_played
        FROM players p
        JOIN scores s ON p.id = s.player_id
        GROUP BY p.id
        ORDER BY avg_score ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 관리자 API (데이터 입력용)

// 새 라운딩 추가
app.post('/api/admin/rounds', (req, res) => {
    const { round_name, round_date, course_id, tee_time, weather, temperature, wind_condition, round_time, prize_money } = req.body;
    
    const query = `
        INSERT INTO rounds (round_name, round_date, course_id, tee_time, weather, temperature, wind_condition, round_time, prize_money, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')
    `;
    
    db.run(query, [round_name, round_date, course_id, tee_time, weather, temperature, wind_condition, round_time, prize_money], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '라운딩이 추가되었습니다.' });
    });
});

// 스코어 추가
app.post('/api/admin/scores', (req, res) => {
    const { round_id, player_id, total_score, ranking, birdie_count, eagle_count, nearest_count, notes } = req.body;
    
    const query = `
        INSERT INTO scores (round_id, player_id, total_score, ranking, birdie_count, eagle_count, nearest_count, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [round_id, player_id, total_score, ranking, birdie_count || 0, eagle_count || 0, nearest_count || 0, notes], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '스코어가 추가되었습니다.' });
    });
});

// 라운딩 상태 업데이트
app.put('/api/admin/rounds/:id/status', (req, res) => {
    const roundId = req.params.id;
    const { status } = req.body;
    
    const query = 'UPDATE rounds SET status = ? WHERE id = ?';
    
    db.run(query, [status, roundId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: '라운딩 상태가 업데이트되었습니다.' });
    });
});

// 골프장 목록 API
app.get('/api/courses', (req, res) => {
    const query = 'SELECT * FROM golf_courses ORDER BY name';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 새 골프장 추가
app.post('/api/admin/courses', (req, res) => {
    const { name, location, course_type, par, yardage } = req.body;
    
    const query = 'INSERT INTO golf_courses (name, location, course_type, par, yardage) VALUES (?, ?, ?, ?, ?)';
    
    db.run(query, [name, location, course_type, par, yardage], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '골프장이 추가되었습니다.' });
    });
});

// 뉴스 추가
app.post('/api/admin/news', (req, res) => {
    const { title, content, image_url, round_id, is_featured } = req.body;
    
    const query = 'INSERT INTO news_feeds (title, content, image_url, round_id, is_featured) VALUES (?, ?, ?, ?, ?)';
    
    db.run(query, [title, content, image_url, round_id, is_featured || false], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: '뉴스가 추가되었습니다.' });
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`HBL 골프 클럽 API 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    initializeDatabase();
});

// 프로세스 종료 시 데이터베이스 연결 정리
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('데이터베이스 연결이 종료되었습니다.');
        process.exit(0);
    });
});

module.exports = app;