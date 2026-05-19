<?php

use CodeIgniter\Test\CIUnitTestCase;

/**
 * Tests del helper d'autenticació JWT.
 *
 * Comproven la generació, la verificació, la caducitat i la detecció
 * de manipulació dels tokens. Són tests unitaris purs: no necessiten
 * base de dades ni servidor.
 *
 * @internal
 */
final class JwtHelperTest extends CIUnitTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Secret fix per a l'entorn de test (no s'usa en producció)
        putenv('JWT_SECRET=secret_de_test_per_a_phpunit_0123456789');
        helper('jwt');
    }

    public function testGenerateProdueixTokensDAccesIRefresc(): void
    {
        $tokens = jwt_generate(42, 'user');

        $this->assertArrayHasKey('access_token', $tokens);
        $this->assertArrayHasKey('refresh_token', $tokens);
        $this->assertIsString($tokens['access_token']);
        $this->assertNotEmpty($tokens['access_token']);
    }

    public function testDecodeRetornaElPayloadDUnTokenValid(): void
    {
        $tokens  = jwt_generate(7, 'admin');
        $decoded = jwt_decode($tokens['access_token']);

        $this->assertNotNull($decoded);
        $this->assertEquals(7, $decoded->sub);
        $this->assertEquals('admin', $decoded->role);
        $this->assertEquals('chesshub', $decoded->iss);
    }

    public function testDecodeRebutjaUnTokenManipulat(): void
    {
        $tokens   = jwt_generate(1, 'user');
        $tampered = $tokens['access_token'] . 'abc';

        $this->assertNull(jwt_decode($tampered));
    }

    public function testDecodeRebutjaUnTokenInvalid(): void
    {
        $this->assertNull(jwt_decode('aixo.no.es.un.jwt'));
        $this->assertNull(jwt_decode(''));
    }

    public function testDecodeRebutjaUnTokenCaducat(): void
    {
        $caducat = jwt_encode([
            'iss'  => 'chesshub',
            'iat'  => time() - 7200,
            'exp'  => time() - 3600, // va caducar fa una hora
            'sub'  => 1,
            'role' => 'user',
        ]);

        $this->assertNull(jwt_decode($caducat));
    }

    public function testTokenSignatAmbUnAltreSecretEsRebutjat(): void
    {
        $tokens = jwt_generate(5, 'user');

        // Canviem el secret: el token anterior ja no s'hauria de validar
        putenv('JWT_SECRET=un_secret_completament_diferent_98765');
        $this->assertNull(jwt_decode($tokens['access_token']));
    }
}
