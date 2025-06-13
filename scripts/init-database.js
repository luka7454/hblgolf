// scripts/init-database.js - 데이터베이스 초기화 스크립트

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, '..', 'hbl_golf.db');

// 기존 데이터베이스 파일이 있으면 삭제 (선택사항)
if (fs.existsSync(dbPath)) {
    console.log('기존 데이터베이스 파일을 삭제합니다...');
    fs.unlinkSync(dbPath);
}

// 새 데이터베이스 생성
const db = new sqlite3.Database(dbPath);

console.log('새 데이터베이스를 생성합니다...');

// SQL 스키마 파일 읽기
const schemaPath = path.join(__dirname, '..', 'schema.sql');

if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql 파일을 찾을 수 없습니다.');
    process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');

// 스키마 실행
db.exec(schema, (err) => {
    if (err) {
        console.error('데이터베이스 스키마 생성 오류:', err.message);
        process.exit(1);
    }
    
    console.log('✅ 데이터베이스 스키마가 성공적으로 생성되었습니다.');
    console.log('✅ 초기 데이터가 성공적으로 삽입되었습니다.');
    
    // 데이터 확인
    checkData();
});

function checkData() {
    console.log('\n📊 데이터베이스 상태 확인:');
    
    // 선수 수 확인
    db.get("SELECT COUNT(*) as count FROM players", (err, row) => {
        if (err) {
            console.error('선수 데이터 확인 오류:', err.message);
        } else {
            console.log(`   선수: ${row.count}명`);
        }
    });
    
    // 골프장 수 확인
    db.get("SELECT COUNT(*) as count FROM golf_courses", (err, row) => {
        if (err) {
            console.error('골프장 데이터 확인 오류:', err.message);
        } else {
            console.log(`   골프장: ${row.count}개`);
        }
    });
    
    // 라운딩 수 확인
    db.get("SELECT COUNT(*) as count FROM rounds", (err, row) => {
        if (err) {
            console.error('라운딩 데이터 확인 오류:', err.message);
        } else {
            console.log(`   라운딩: ${row.count}회`);
        }
    });
    
    // 스코어 수 확인
    db.get("SELECT COUNT(*) as count FROM scores", (err, row) => {
        if (err) {
            console.error('스코어 데이터 확인 오류:', err.message);
        } else {
            console.log(`   스코어 기록: ${row.count}개`);
        }
    });
    
    // 뉴스 수 확인
    db.get("SELECT COUNT(*) as count FROM news_feeds", (err, row) => {
        if (err) {
            console.error('뉴스 데이터 확인 오류:', err.message);
        } else {
            console.log(`   뉴스: ${row.count}개`);
            
            // 데이터베이스 연결 종료
            db.close((err) => {
                if (err) {
                    console.error('데이터베이스 연결 종료 오류:', err.message);
                } else {
                    console.log('\n🎉 데이터베이스 초기화가 완료되었습니다!');
                    console.log('💡 "npm start" 명령어로 서버를 시작할 수 있습니다.');
                }
            });
        }
    });
}