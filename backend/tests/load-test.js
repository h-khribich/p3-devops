// @ts-nocheck
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Montée en charge rapide
    { duration: '1m30s', target: 10 }, // Baisse et maintien
    { duration: '20s', target: 15 }, // Remontée légère
  ],
};

const binFile = new ArrayBuffer(1024 * 1024); // Fichier 1Mo

export default function () {
  const data = {
    file: http.file(binFile, 'test.jpg', 'image/jpeg'),
  };

  const res = http.post('http://localhost:3000/uploads/anonymous', data);

  check(res, {
    'status is 201': (r) => r.status === 201,
  });

  sleep(1);
}
