<?php

use App\Models\User;
use App\Services\CerMicroserviceSigner;

it('builds deterministic hmac headers', function () {
    config(['services.cer.shared_secret' => 'test-secret']);

    $user = User::factory()->make(['id' => 42]);
    $signer = new CerMicroserviceSigner;

    $body = '{"title":"Test"}';
    $headers = $signer->headers($user, 'POST', 'jobs/cer', $body);

    expect($headers)->toHaveKeys(['X-CER-USER-KEY', 'X-CER-TIMESTAMP', 'X-CER-SIGNATURE'])
        ->and($headers['X-CER-USER-KEY'])->toBe('42');

    $timestamp = $headers['X-CER-TIMESTAMP'];
    $bodyHash = hash('sha256', $body);
    $payload = implode('|', ['42', $timestamp, 'POST', 'jobs/cer', $bodyHash]);
    $expected = hash_hmac('sha256', $payload, 'test-secret');

    expect($headers['X-CER-SIGNATURE'])->toBe($expected);
});

it('uses empty body hash for prosit upload signatures', function () {
    config(['services.cer.shared_secret' => 'test-secret']);

    $user = User::factory()->make(['id' => 1]);
    $signer = new CerMicroserviceSigner;

    $headers = $signer->headers($user, 'POST', 'prosits', null);
    $emptyHash = hash('sha256', '');
    $payload = implode('|', [
        '1',
        $headers['X-CER-TIMESTAMP'],
        'POST',
        'prosits',
        $emptyHash,
    ]);

    expect($headers['X-CER-SIGNATURE'])->toBe(hash_hmac('sha256', $payload, 'test-secret'));
});
