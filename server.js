// server.js - 클라우드타입용 수정 버전

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080; // 클라우드타입은 8080 포트 사용

// 미들웨어 설정
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:8080',
        'https://web-hblgolf-mb4ipg5fd735a020.sel4.cloudtype.app', // 👈 새 프론트엔드 도메인 추가
        process.env.FRONTEND_URL || 'https://your-frontend-domain.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public')); // 정적 파일 서빙

// 헬스체크 엔드포인트 (클라우드타입용)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        service: 'HBL Golf Club API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

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
                console.log('✅ 데이터베이스가 초기화되었습니다.');
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

// 서버 시작 - 클라우드타입용 수정
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏌️‍♂️ HBL 골프 클럽 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // 클라우드타입 환경 확인
    if (process.env.NODE_ENV === 'production') {
        console.log('🚀 클라우드타입 프로덕션 환경에서 실행 중입니다.');
    } else {
        console.log('🔧 로컬 개발 환경에서 실행 중입니다.');
        console.log(`📱 로컬 접속: http://localhost:${PORT}`);
    }
    
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

// server.js에 추가할 수동 초기화 API

// 데이터베이스 상태 확인 API
app.get('/api/admin/db-status', (req, res) => {
    const queries = [
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"',
        'SELECT COUNT(*) as players FROM players',
        'SELECT COUNT(*) as courses FROM golf_courses', 
        'SELECT COUNT(*) as rounds FROM rounds',
        'SELECT COUNT(*) as scores FROM scores',
        'SELECT COUNT(*) as news FROM news_feeds'
    ];
    
    const results = {};
    let completed = 0;
    
    // 테이블 개수 확인
    db.get(queries[0], (err, row) => {
        if (err) results.tables = 'Error: ' + err.message;
        else results.tables = row.count;
        
        if (++completed === 6) res.json(results);
    });
    
    // 각 테이블 레코드 수 확인
    ['players', 'courses', 'rounds', 'scores', 'news'].forEach((table, index) => {
        db.get(queries[index + 1], (err, row) => {
            if (err) results[table] = 'Error: ' + err.message;
            else results[table] = row ? row[table] : 0;
            
            if (++completed === 6) res.json(results);
        });
    });
});

// 수동 데이터베이스 초기화 API
app.post('/api/admin/init-database', (req, res) => {
    console.log('🔄 수동 데이터베이스 초기화 시작...');
    
    // 1. 테이블 생성
    const createTables = `
        -- 선수 정보 테이블
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50) NOT NULL,
            eng_name VARCHAR(100),
            nationality VARCHAR(50),
            birth_date DATE,
            height INTEGER,
            weight INTEGER,
            membership_type VARCHAR(50),
            join_year INTEGER,
            political_view VARCHAR(50),
            photo_url VARCHAR(255),
            sponsor_img VARCHAR(255),
            membership_id VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 골프장 정보 테이블
        CREATE TABLE IF NOT EXISTS golf_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            location VARCHAR(100),
            course_type VARCHAR(50),
            par INTEGER,
            yardage INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 라운딩 정보 테이블
        CREATE TABLE IF NOT EXISTS rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_name VARCHAR(100) NOT NULL,
            round_date DATE NOT NULL,
            course_id INTEGER,
            tee_time TIME,
            weather VARCHAR(100),
            temperature INTEGER,
            wind_condition VARCHAR(50),
            round_time VARCHAR(20),
            prize_money VARCHAR(50),
            status VARCHAR(20) DEFAULT 'upcoming',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES golf_courses(id)
        );

        -- 스코어 기록 테이블
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            total_score INTEGER NOT NULL,
            ranking INTEGER,
            birdie_count INTEGER DEFAULT 0,
            eagle_count INTEGER DEFAULT 0,
            nearest_count INTEGER DEFAULT 0,
            fairway_hit_rate DECIMAL(5,2),
            green_hit_rate DECIMAL(5,2),
            putting_average DECIMAL(3,1),
            drive_distance INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (round_id) REFERENCES rounds(id),
            FOREIGN KEY (player_id) REFERENCES players(id)
        );

        -- 홀별 상세 스코어 테이블
        CREATE TABLE IF NOT EXISTS hole_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            score_id INTEGER NOT NULL,
            hole_number INTEGER NOT NULL,
            par INTEGER NOT NULL,
            score INTEGER NOT NULL,
            putts INTEGER,
            fairway_hit BOOLEAN DEFAULT FALSE,
            green_hit BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (score_id) REFERENCES scores(id)
        );

        -- 장비 정보 테이블
        CREATE TABLE IF NOT EXISTS equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            equipment_type VARCHAR(50) NOT NULL,
            brand VARCHAR(50),
            model VARCHAR(100),
            specifications TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id)
        );

        -- 뉴스/피드 테이블
        CREATE TABLE IF NOT EXISTS news_feeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(200) NOT NULL,
            content TEXT,
            image_url VARCHAR(255),
            round_id INTEGER,
            is_featured BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (round_id) REFERENCES rounds(id)
        );
    `;
    
    db.exec(createTables, (err) => {
        if (err) {
            console.error('테이블 생성 오류:', err.message);
            return res.status(500).json({ error: '테이블 생성 실패: ' + err.message });
        }
        
        console.log('✅ 테이블 생성 완료');
        
        // 2. 초기 데이터 삽입
        insertInitialData(res);
    });
});

// 초기 데이터 삽입 함수
function insertInitialData(res) {
    console.log('📝 초기 데이터 삽입 시작...');
    
    const insertQueries = [
        // 선수 정보 삽입
        `INSERT OR IGNORE INTO players (name, eng_name, nationality, birth_date, height, weight, membership_type, join_year, political_view, photo_url, sponsor_img, membership_id) VALUES
        ('김종혁', 'Kim Jay', '미국', '1990-11-30', 170, 77, 'HBL 정회원', 2022, 'Donald Trump', 'images/jay.png', 'images/stay.png', 'HBL 2022'),
        ('정인석', 'Jeong In Seok', '한국(부산)', '1990-09-24', 165, 65, 'HBL 정회원', 2022, '극우', 'images/suk.PNG', 'images/coupang.png', 'HBL 2022'),
        ('김상현', 'Kim Sang Hyun', '중국(베이징)', '1990-09-24', 173, 82, 'HBL 정회원', 2010, '극우', 'images/sang.jpg', 'images/naver.PNG', 'HBL 2010'),
        ('조영복', 'Cho Young Bok', '대한민국(성남)', '1990-02-14', 183, 100, 'HBL 정회원', 2025, '정상우파', 'images/bok2.jpg', 'images/kb.webp', 'HBL 2024')`,
        
        // 골프장 정보 삽입
        `INSERT OR IGNORE INTO golf_courses (name, location, course_type, par, yardage) VALUES
        ('스톤게이트CC', '경기도', '18홀', 72, 6800),
        ('밀양 에스파크', '경상남도 밀양', '18홀', 72, 6500),
        ('아라미르CC', '경상남도', '18홀', 72, 6600),
        ('양산CC', '경상남도 양산', '18홀', 72, 6400)`,
        
        // 라운딩 정보 삽입
        `INSERT OR IGNORE INTO rounds (round_name, round_date, course_id, tee_time, weather, temperature, wind_condition, round_time, prize_money, status) VALUES
        ('스톤게이트CC 라운딩', '2025-06-06', 1, '06:05', '맑음', 24, '약함', '4시간 30분', '1000원빵', 'finished'),
        ('밀양 에스파크 라운딩', '2025-05-11', 2, '13:35', '맑음', 22, '약함', '4시간 30분', '1000원빵', 'finished'),
        ('아라미르CC 라운딩', '2025-04-04', 3, '18:40', '흐림', 18, '보통', '4시간 15분', '1000원빵', 'finished'),
        ('양산CC 라운딩', '2025-03-19', 4, '18:40', '맑음', 16, '강함', '4시간 45분', '1000원빵', 'finished')`,
        
        // 스코어 기록 삽입
        `INSERT OR IGNORE INTO scores (round_id, player_id, total_score, ranking, birdie_count, nearest_count) VALUES
        (1, 4, 95, 1, 1, 0), (1, 1, 99, 2, 0, 0), (1, 3, 105, 3, 0, 0), (1, 2, 114, 4, 0, 0),
        (2, 1, 86, 1, 1, 1), (2, 2, 102, 2, 0, 0), (2, 4, 117, 3, 0, 0), (2, 3, 119, 4, 0, 0),
        (3, 1, 100, 1, 0, 0), (3, 3, 107, 2, 0, 0), (3, 2, 107, 2, 0, 0), (3, 4, 117, 4, 0, 0),
        (4, 3, 109, 1, 0, 1), (4, 1, 111, 2, 0, 1), (4, 2, 116, 3, 0, 0), (4, 4, 123, 4, 0, 0)`,
        
        // 뉴스 피드 삽입
        `INSERT OR IGNORE INTO news_feeds (title, content, image_url, round_id, is_featured) VALUES
        ('"거리충" 조영복 반전의 우승.. 잔디짬밥 무시못해..', '비거리충, 원온충의 표본인 조영복이 스톤게이트CC에서 반전의 우승을 차지했다.', 'images/stonegate.jpg', 1, TRUE),
        ('"훈수충" 김종혁 여전히 선두권 지켜.. 정상에서 내려올 생각없어', '김종혁이 또 다시 상위권을 유지하며 HBL의 강자임을 입증했다.', 'images/jay.png', 2, FALSE),
        ('"아갈현" "훈수충" 제주도 전지훈련 참석', 'HBL 멤버들이 제주도에서 전지훈련을 가졌다.', '', NULL, FALSE),
        ('"아갈현" 김상현 양산 라운딩 반전 우승과 갈비뻐 맞바꿔..', '김상현이 양산CC에서 우승하며 갈비뻐 회식을 가졌다.', '', 4, FALSE)`
    ];
    
    let completed = 0;
    const total = insertQueries.length;
    let hasError = false;
    
    insertQueries.forEach((query, index) => {
        db.run(query, function(err) {
            if (err && !err.message.includes('UNIQUE constraint failed')) {
                console.error(`쿼리 ${index + 1} 실행 오류:`, err.message);
                hasError = true;
            } else {
                console.log(`✅ 쿼리 ${index + 1} 완료`);
            }
            
            completed++;
            
            if (completed === total) {
                if (hasError) {
                    res.status(500).json({ 
                        error: '일부 데이터 삽입 실패',
                        message: '로그를 확인하세요'
                    });
                } else {
                    console.log('🎉 모든 초기 데이터 삽입 완료!');
                    res.json({ 
                        message: '데이터베이스 초기화가 완료되었습니다!',
                        tablesCreated: true,
                        dataInserted: true
                    });
                }
            }
        });
    });
}