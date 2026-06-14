// Usa o algoritmo DLT normalizado para encontrar a matriz de projeção
function calculateDLT(points){
    const n = points.length;
    if (n < 6) return null;

    let c2D, c3D, s2D, s3D;
    let dist2D = 0, dist3D = 0;
    let T,U,P_norm,P,A = [];

    function DLT_normalize(){
        // Centróides
        let sumU = 0, sumV = 0, sumX = 0, sumY = 0, sumZ = 0;
        points.forEach(p => { 
            sumU += p.u; sumV += p.v; 
            sumX += p.x; sumY += p.y; sumZ += p.z; 
        });
        c2D = [sumU / n, sumV / n];
        c3D = [sumX / n, sumY / n, sumZ / n];

        // Fatores de Escala
        points.forEach(p => {
            dist2D += Math.hypot(p.u - c2D[0], p.v - c2D[1]);
            dist3D += Math.hypot(p.x - c3D[0], p.y - c3D[1], p.z - c3D[2]);
        });
        dist2D /= n; 
        dist3D /= n;
        s2D = Math.SQRT2 / dist2D;
        s3D = Math.sqrt(3) / dist3D;

        // Matrizes de Transformação
        T = [ 
            [s2D, 0, -s2D * c2D[0]], 
            [0, s2D, -s2D * c2D[1]], 
            [0, 0, 1] 
        ];
        U = [ 
            [s3D, 0, 0, -s3D * c3D[0]], 
            [0, s3D, 0, -s3D * c3D[1]], 
            [0, 0, s3D, -s3D * c3D[2]], 
            [0, 0, 0, 1] 
        ];
    }

    function DLT_build_linear_system(){
        points.forEach(p => {
            // Normaliza os pontos
            const p2D = numeric.dot(T, [p.u, p.v, 1]);
            const p3D = numeric.dot(U, [p.x, p.y, p.z, 1]);
            const u = p2D[0], v = p2D[1];
            const X = p3D[0], Y = p3D[1], Z = p3D[2];

            // Gera as linhas do sistema linear
            A.push([ 0, 0, 0, 0,  -X, -Y, -Z, -1,  v*X, v*Y, v*Z, v ]);
            A.push([ X, Y, Z, 1,   0, 0, 0, 0,    -u*X, -u*Y, -u*Z, -u ]);
        });
    }

    function DLT_solve_linear_system(){
        const svd = numeric.svd(A);
        const pVec = svd.V.map(row => row[11]);
        P_norm = [
            [pVec[0], pVec[1], pVec[2], pVec[3]],
            [pVec[4], pVec[5], pVec[6], pVec[7]],
            [pVec[8], pVec[9], pVec[10], pVec[11]]
        ];
    }

    function DLT_denormalize(){
        const T_inv = numeric.inv(T);
        const P_scaled = numeric.dot(T_inv, numeric.dot(P_norm, U));
        const scale = P_scaled[2][3];
        P = numeric.div(P_scaled, scale);
    }

    DLT_normalize();
    DLT_build_linear_system();
    DLT_solve_linear_system();
    DLT_denormalize();
    return P;
}

// Dada a matriz de projeção P, extrai e retorna os parâmetros dela
function paramExtraction(P){
    // Definição de M e p4
    const M = [
            [P[0][0], P[0][1], P[0][2]],
            [P[1][0], P[1][1], P[1][2]],
            [P[2][0], P[2][1], P[2][2]]
        ];
    const p4 = [P[0][3], P[1][3], P[2][3]];

    // Centro da câmera
    const Minv = numeric.inv(M);
    const C = numeric.dot(numeric.mul(Minv, -1), p4);

    // Decomposição QR com Gram-Schmidt
    let R,K;
    function QR_dec(){
        const m3 = M[2], m2 = M[1], m1 = M[0];
        let k33 = numeric.norm2(m3);
        let r3 = numeric.div(m3, k33);

        let k23 = numeric.dot(m2, r3);
        let r2_unnorm = numeric.sub(m2, numeric.mul(k23, r3));
        let k22 = numeric.norm2(r2_unnorm);
        let r2 = numeric.div(r2_unnorm, k22);

        let k13 = numeric.dot(m1, r3), k12 = numeric.dot(m1, r2);
        let r1_pre = numeric.add(numeric.mul(k13, r3), numeric.mul(k12, r2));
        let r1_unnorm = numeric.sub(m1, r1_pre);
        let k11 = numeric.norm2(r1_unnorm);
        let r1 = numeric.div(r1_unnorm, k11);

        R = [r1, r2, r3];
        K = [
            [k11, k12, k13],
            [0, k22, k23],
            [0, 0, k33]
        ];
    }
    QR_dec();

    // Normaliza a diagonal de K por equivalência e padronização
    K = numeric.div(K, K[2][2]);
    if (K[0][0] < 0) {
        K[0][0] *= -1; K[0][1] *= -1; K[0][2] *= -1;
        R[0] = numeric.mul(R[0], -1);
    }
    if (K[1][1] < 0) {
        K[1][1] *= -1; K[1][2] *= -1;
        R[1] = numeric.mul(R[1], -1);
    }

    // Conversão dos Ângulos
    const pitch = Math.atan2(R[2][1], R[2][2]) * (180 / Math.PI);
    const yaw = Math.atan2(-R[2][0], Math.sqrt(R[2][1]**2 + R[2][2]**2)) * (180 / Math.PI);
    const roll = Math.atan2(R[1][0], R[0][0]) * (180 / Math.PI);

    return { 
        pos: C, 
        ang: { pitch, yaw, roll },
        len: { fx: K[0][0], fy: K[1][1], cx: K[0][2], cy: K[1][2] }
    };
}