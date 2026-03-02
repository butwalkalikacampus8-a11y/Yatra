// Force the worker to realize it's in a Node environment
process.env.NODE_ENV = 'production';
const { parentPort, workerData } = require('worker_threads');
const snarkjs = require('snarkjs');

async function run() {
    try {
        const { vKey, publicSignals, proof } = workerData;
        // The actual math
        const result = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        parentPort.postMessage({ ok: true, result });
    } catch (err) {
        parentPort.postMessage({ ok: false, error: err.message });
    }
}
run();