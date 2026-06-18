const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
    try {
        // Evita bloqueios de requisições de origens diferentes (CORS)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        
        const historico = (await redis.get('historico_sinais')) || [];
        return res.status(200).json(historico);
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        return res.status(200).json([]);
    }
}
