-- HBL 골프 클럽 데이터베이스 스키마

-- 1. 선수 정보 테이블
CREATE TABLE players (
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

-- 2. 골프장 정보 테이블
CREATE TABLE golf_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    course_type VARCHAR(50),
    par INTEGER,
    yardage INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 라운딩 정보 테이블
CREATE TABLE rounds (
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
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, ongoing, finished
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES golf_courses(id)
);

-- 4. 스코어 기록 테이블
CREATE TABLE scores (
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

-- 5. 홀별 상세 스코어 테이블
CREATE TABLE hole_scores (
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

-- 6. 장비 정보 테이블
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    equipment_type VARCHAR(50) NOT NULL, -- driver, fairway_wood, iron, wedge, putter, ball, glove
    brand VARCHAR(50),
    model VARCHAR(100),
    specifications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- 7. 뉴스/피드 테이블
CREATE TABLE news_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    image_url VARCHAR(255),
    round_id INTEGER,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES rounds(id)
);

-- 초기 데이터 삽입

-- 선수 정보 입력
INSERT INTO players (name, eng_name, nationality, birth_date, height, weight, membership_type, join_year, political_view, photo_url, sponsor_img, membership_id) VALUES
('김종혁', 'Kim Jay', '미국', '1990-11-30', 170, 77, 'HBL 정회원', 2022, 'Donald Trump', 'images/jay.png', 'images/stay.png', 'HBL 2022'),
('정인석', 'Jeong In Seok', '한국(부산)', '1990-09-24', 165, 65, 'HBL 정회원', 2022, '극우', 'images/suk.PNG', 'images/coupang.png', 'HBL 2022'),
('김상현', 'Kim Sang Hyun', '중국(베이징)', '1990-09-24', 173, 82, 'HBL 정회원', 2010, '극우', 'images/sang.jpg', 'images/naver.PNG', 'HBL 2010'),
('조영복', 'Cho Young Bok', '대한민국(성남)', '1990-02-14', 183, 100, 'HBL 정회원', 2025, '정상우파', 'images/bok2.jpg', 'images/kb.webp', 'HBL 2024');

-- 골프장 정보 입력
INSERT INTO golf_courses (name, location, course_type, par, yardage) VALUES
('스톤게이트CC', '경기도', '18홀', 72, 6800),
('밀양 에스파크', '경상남도 밀양', '18홀', 72, 6500),
('아라미르CC', '경상남도', '18홀', 72, 6600),
('양산CC', '경상남도 양산', '18홀', 72, 6400);

-- 라운딩 정보 입력
INSERT INTO rounds (round_name, round_date, course_id, tee_time, weather, temperature, wind_condition, round_time, prize_money, status) VALUES
('스톤게이트CC 라운딩', '2025-06-06', 1, '06:05', '맑음', 24, '약함', '4시간 30분', '1000원빵', 'finished'),
('밀양 에스파크 라운딩', '2025-05-11', 2, '13:35', '맑음', 22, '약함', '4시간 30분', '1000원빵', 'finished'),
('아라미르CC 라운딩', '2025-04-04', 3, '18:40', '흐림', 18, '보통', '4시간 15분', '1000원빵', 'finished'),
('양산CC 라운딩', '2025-03-19', 4, '18:40', '맑음', 16, '강함', '4시간 45분', '1000원빵', 'finished');

-- 스코어 기록 입력
-- 스톤게이트CC 라운딩 (2025-06-06)
INSERT INTO scores (round_id, player_id, total_score, ranking, birdie_count, nearest_count) VALUES
(1, 4, 95, 1, 1, 0),  -- 조영복 1위
(1, 1, 99, 2, 0, 0),  -- 김종혁 2위
(1, 3, 105, 3, 0, 0), -- 김상현 3위
(1, 2, 114, 4, 0, 0); -- 정인석 4위

-- 밀양 에스파크 라운딩 (2025-05-11)
INSERT INTO scores (round_id, player_id, total_score, ranking, birdie_count, nearest_count) VALUES
(2, 1, 86, 1, 1, 1),  -- 김종혁 1위
(2, 2, 102, 2, 0, 0), -- 정인석 2위
(2, 4, 117, 3, 0, 0), -- 조영복 3위
(2, 3, 119, 4, 0, 0); -- 김상현 4위

-- 아라미르CC 라운딩 (2025-04-04)
INSERT INTO scores (round_id, player_id, total_score, ranking, birdie_count, nearest_count) VALUES
(3, 1, 100, 1, 0, 0), -- 김종혁 1위
(3, 3, 107, 2, 0, 0), -- 김상현 2위
(3, 2, 107, 2, 0, 0), -- 정인석 2위 (공동)
(3, 4, 117, 4, 0, 0); -- 조영복 4위

-- 양산CC 라운딩 (2025-03-19)
INSERT INTO scores (round_id, player_id, total_score, ranking, birdie_count, nearest_count) VALUES
(4, 3, 109, 1, 0, 1), -- 김상현 1위
(4, 1, 111, 2, 0, 1), -- 김종혁 2위
(4, 2, 116, 3, 0, 0), -- 정인석 3위
(4, 4, 123, 4, 0, 0); -- 조영복 4위

-- 장비 정보 입력 (김종혁 예시)
INSERT INTO equipment (player_id, equipment_type, brand, model, specifications) VALUES
(1, 'driver', '캘러웨이', '로그', '9° S 50g'),
(1, 'fairway_wood', '핑', '430', '3번(15°)'),
(1, 'utility', '핑', '430', '4번(22°)'),
(1, 'iron', '테일러메이드', 'P7MB', '4-PW'),
(1, 'wedge', '타이틀리스트', '보키 SM10', '50°, 54°, 58°'),
(1, 'putter', '오디세이', '투볼 퍼터', ''),
(1, 'ball', '커크랜드', '3피스', ''),
(1, 'glove', '캘러웨이', '장갑만 씀', '');

-- 뉴스 피드 입력
INSERT INTO news_feeds (title, content, image_url, round_id, is_featured) VALUES
('"거리충" 조영복 반전의 우승.. 잔디짬밥 무시못해..', '비거리충, 원온충의 표본인 조영복이 스톤게이트CC에서 반전의 우승을 차지했다.', 'images/stonegate.jpg', 1, TRUE),
('"훈수충" 김종혁 여전히 선두권 지켜.. 정상에서 내려올 생각없어', '김종혁이 또 다시 상위권을 유지하며 HBL의 강자임을 입증했다.', 'images/jay.png', 2, FALSE),
('"아갈현" "훈수충" 제주도 전지훈련 참석', 'HBL 멤버들이 제주도에서 전지훈련을 가졌다.', '', NULL, FALSE),
('"아갈현" 김상현 양산 라운딩 반전 우승과 갈비뻐 맞바꿔..', '김상현이 양산CC에서 우승하며 갈비뻐 회식을 가졌다.', '', 4, FALSE);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_scores_round_id ON scores(round_id);
CREATE INDEX idx_scores_player_id ON scores(player_id);
CREATE INDEX idx_rounds_date ON rounds(round_date);
CREATE INDEX idx_hole_scores_score_id ON hole_scores(score_id);
CREATE INDEX idx_equipment_player_id ON equipment(player_id);