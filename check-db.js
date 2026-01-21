const {prisma}=require('./packages/db');
const p=prisma;
p.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
.then(r=>console.log('Tables:', JSON.stringify(r)))
.catch(e=>console.error('Error:', e.message))
.finally(()=>p.$disconnect());
