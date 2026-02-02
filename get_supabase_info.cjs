const https = require('https');

const token = 'sbp_66c218ea4d210d9ea03e4a4814c5acbb75213d61';

function apiRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.supabase.com',
            path: '/v1' + path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            rejectUnauthorized: false // IGNORE CERT ERROR
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(`JSON Parse Error: ${e.message} | Body: ${data}`);
                    }
                } else {
                    reject(`Status: ${res.statusCode}, Body: ${data}`);
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function main() {
    try {
        console.log("Fetching projects...");
        const projects = await apiRequest('/projects');

        if (!Array.isArray(projects)) {
            console.log("Unexpected response format:", projects);
            return;
        }

        if (projects.length === 0) {
            console.log("No projects found.");
            return;
        }

        const project = projects[0];
        console.log(`Project Name: ${project.name}`);
        console.log(`Ref: ${project.id}`);
        console.log(`URL: https://${project.id}.supabase.co`);

        // Try to get keys from api_keys property if exists, or try fetching specifically
        // Based on docs, GET /projects returns minimal info. Let's try to infer if keys are there.
        // If not, we might need a workaround.
        // Actually, let's just print keys if they exist.
        if (project.api_keys) {
            project.api_keys.forEach(k => {
                console.log(`KEY_${k.name}: ${k.api_key}`);
            });
        } else {
            // Attempt to fetch keys via separate endpoint if we can guess it? 
            // Management API 'GET /projects/{ref}/api-keys' is not standard public V1. 
            // But let's check if the project object itself has it.
            console.log("Keys not found in project listing. Dumping partial object:", JSON.stringify(project).substring(0, 200));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}
main();
