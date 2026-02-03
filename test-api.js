/**
 * Simple API test script
 * Tests the heartbeat monitor API endpoints
 */

console.log('Testing WasteHero Heartbeat Monitor API...\n');

// Wait for server to be ready
setTimeout(async () => {
  try {
    // Test health endpoint
    console.log('1. Testing /api/health endpoint...');
    const healthRes = await fetch('http://localhost:3000/api/health');
    const health = await healthRes.json();
    console.log('   ✓ Health:', health.status);
    console.log('   ✓ Uptime:', Math.round(health.uptime), 'seconds\n');

    // Wait a bit for some heartbeats to complete
    console.log('2. Waiting 5 seconds for heartbeats...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test services endpoint
    console.log('3. Testing /api/services endpoint...');
    const servicesRes = await fetch('http://localhost:3000/api/services');
    const servicesData = await servicesRes.json();
    console.log(`   ✓ Found ${servicesData.services.length} services\n`);

    // Display service statuses
    console.log('Service Statuses:');
    console.log('═══════════════════════════════════════════════');
    for (const service of servicesData.services) {
      const statusIcon = {
        'healthy': '💚',
        'warning': '💛',
        'degraded': '🟠',
        'critical': '🔴',
        'flatline': '💀',
        'unknown': '❓'
      }[service.status || 'unknown'];

      console.log(`${statusIcon} ${service.name.padEnd(15)} | ${service.status || 'unknown'} | Uptime: ${service.uptime?.toFixed(1) || 0}%`);
    }
    console.log('═══════════════════════════════════════════════\n');

    // Test scheduler endpoint
    console.log('4. Testing /api/scheduler endpoint...');
    const schedulerRes = await fetch('http://localhost:3000/api/scheduler');
    const scheduler = await schedulerRes.json();
    console.log('   ✓ Scheduler running:', scheduler.running);
    console.log('   ✓ Active jobs:', scheduler.jobs.length, '\n');

    console.log('✅ All API tests passed!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}, 2000);
