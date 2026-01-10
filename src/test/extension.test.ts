import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('predicte.predicte'));
  });

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('predicte.predicte');
    await ext?.activate();
    assert.strictEqual(ext?.isActive, true);
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('predicte.toggle'));
    assert.ok(commands.includes('predicte.setApiKey'));
    assert.ok(commands.includes('predicte.clearCache'));
  });
});
