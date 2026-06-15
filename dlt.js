// Usa o algoritmo DLT normalizado para encontrar a matriz de projeção
function calculateDLT(points){
    const n = points.length;
    if(n < 6) return null;

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
    let M = [
        [P[0][0], P[0][1], P[0][2]],
        [P[1][0], P[1][1], P[1][2]],
        [P[2][0], P[2][1], P[2][2]]
    ];
    let p4 = [P[0][3], P[1][3], P[2][3]];

    // Correção de sinal de M
    let detM = M[0][0]*(M[1][1]*M[2][2] - M[1][2]*M[2][1]) 
             - M[0][1]*(M[1][0]*M[2][2] - M[1][2]*M[2][0]) 
             + M[0][2]*(M[1][0]*M[2][1] - M[1][1]*M[2][0]);
             
    if(detM < 0){
        for(let i = 0; i < 3; i++){
            for(let j = 0; j < 3; j++) M[i][j] *= -1;
            p4[i] *= -1;
        }
    }

    // Centro da câmera C
    const Minv = numeric.inv(M);
    const C = numeric.dot(numeric.mul(Minv, -1), p4);

    // Decomposição RQ
    let R, K;
    function QR_dec(){
        const m3 = M[2], m2 = M[1], m1 = M[0];
        let k33 = numeric.norm2(m3);
        let r3 = numeric.div(m3, k33);
        
        let k23 = numeric.dot(m2, r3);
        let r2_unnorm = numeric.sub(m2, numeric.mul(k23, r3));
        let k22 = numeric.norm2(r2_unnorm);
        let r2 = numeric.div(r2_unnorm, k22);
        
        let k13 = numeric.dot(m1, r3), k12 = numeric.dot(m1, r2);
        let r1_pre = numeric.add(numeric.mul(k13, r3), numeric.mul(k12, r2))
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

    K = numeric.div(K, K[2][2]);
    let detR = R[0][0]*(R[1][1]*R[2][2] - R[1][2]*R[2][1]) 
             - R[0][1]*(R[1][0]*R[2][2] - R[1][2]*R[2][0]) 
             + R[0][2]*(R[1][0]*R[2][1] - R[1][1]*R[2][0]);
             
    if(detR < 0){
        R[1] = numeric.mul(R[1], -1);
        K[1][1] *= -1;
        K[1][2] *= -1;
    }

    // Extração de ângulos
    const Nx = R[2][0], Ny = -R[2][1], Nz = R[2][2];
    const Ny_norm = Ny / Math.hypot(R[2][0], -R[2][1], R[2][2]);

    const Uy = -R[0][1];
    const Vy = -R[1][1];

    const pitch = -Math.asin(Math.max(-1, Math.min(1, Ny_norm))) * (180 / Math.PI);
    const yaw   = Math.atan2(Nz, Nx) * (180 / Math.PI);
    const roll  = Math.atan2(Uy, Vy) * (180 / Math.PI);

    const fy_px = Math.abs(K[1][1]);
    const fx_px = Math.abs(K[0][0]);
    const cy_px = K[1][2]; 
    const cx_px = K[0][2];

    // Referenciais da imagem
    let origTop = 0, origBottom = canvas.height;
    if(cropData && origSize){
        origTop = -cropData.y * (canvas.height / cropData.height);
        origBottom = (origSize.h - cropData.y) * (canvas.height / cropData.height);
    }

    // FOV e Aspect
    let fov = (Math.atan((cy_px - origTop) / fy_px) + Math.atan((origBottom - cy_px) / fy_px)) * (180 / Math.PI);
    const aspect = (origSize.w / origSize.h) * (fy_px / fx_px);
    console.log(fy_px); console.log('/'); console.log(fx_px);

    return {
        pos: C,
        ang: { pitch, yaw, roll },
        len: { fov, aspect }
    };
}