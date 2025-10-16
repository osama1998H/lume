import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Wifi,
  WifiOff,
  Download,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react';
import Button from '../ui/Button';
import type { MCPClient, MCPBridgeStatus, MCPConfigResult } from '@/types';
import { logger } from '@/services/logging/RendererLogger';

/**
 * MCPIntegration Component
 * Provides auto-configuration interface for MCP clients (Claude Desktop, Code, Cursor)
 */
const MCPIntegration: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [bridgeStatus, setBridgeStatus] = useState<MCPBridgeStatus>({ running: false, port: null });
  const [loading, setLoading] = useState<Record<MCPClient, boolean>>({
    'claude-desktop': false,
    'claude-code': false,
    'cursor': false,
  });
  const [configResults, setConfigResults] = useState<Record<MCPClient, MCPConfigResult | null>>({
    'claude-desktop': null,
    'claude-code': null,
    'cursor': null,
  });
  const [manualConfigClient, setManualConfigClient] = useState<MCPClient>('claude-desktop');
  const [manualConfig, setManualConfig] = useState<string>('');

  /**
   * Load HTTP Bridge status
   */
  const loadBridgeStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.mcpConfig.getBridgeStatus();
      setBridgeStatus(status);
    } catch (error) {
      logger.error('Failed to load bridge status:', {}, error instanceof Error ? error : undefined);
      toast.error(t('mcp.errors.bridgeStatusFailed'));
    }
  }, [t]);

  /**
   * Load manual configuration for a client
   */
  const loadManualConfig = useCallback(async (client: MCPClient) => {
    try {
      const config = await window.electronAPI.mcpConfig.generateConfig(client);
      setManualConfig(config);
    } catch (error) {
      logger.error('Failed to generate config:', {}, error instanceof Error ? error : undefined);
      toast.error(t('mcp.errors.configGenerationFailed'));
    }
  }, [t]);

  // Fetch bridge status on mount
  useEffect(() => {
    loadBridgeStatus();
  }, [loadBridgeStatus]);

  // Load manual config when client changes
  useEffect(() => {
    loadManualConfig(manualConfigClient);
  }, [loadManualConfig, manualConfigClient]);

  /**
   * Auto-configure a specific client
   */
  const handleAutoConfigure = async (client: MCPClient) => {
    setLoading((prev) => ({ ...prev, [client]: true }));
    setConfigResults((prev) => ({ ...prev, [client]: null }));

    try {
      const result = await window.electronAPI.mcpConfig.autoConfigure(client);
      setConfigResults((prev) => ({ ...prev, [client]: result }));

      if (result.success) {
        const displayName = await window.electronAPI.mcpConfig.getClientDisplayName(client);
        toast.success(t('mcp.success.configured', { client: displayName }));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      logger.error(`Failed to auto-configure ${client}:`, {}, error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : t('mcp.errors.unknownError');
      toast.error(t('mcp.errors.configurationFailed', { error: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, [client]: false }));
    }
  };

  /**
   * Copy manual config to clipboard
   */
  const handleCopyConfig = async () => {
    try {
      const success = await window.electronAPI.mcpConfig.copyToClipboard(manualConfig);
      if (success) {
        toast.success(t('mcp.success.copiedToClipboard'));
      } else {
        toast.error(t('mcp.errors.copyFailed'));
      }
    } catch (error) {
      logger.error('Failed to copy to clipboard:', {}, error instanceof Error ? error : undefined);
      toast.error(t('mcp.errors.copyFailed'));
    }
  };

  /**
   * Render client configuration card
   */
  const renderClientCard = (client: MCPClient, icon: React.ReactNode, description: string) => {
    const isLoading = loading[client];
    const result = configResults[client];
    const displayName = client
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return (
      <div
        key={client}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">{icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {displayName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

            {result && (
              <div
                className={`mb-4 p-3 rounded-md flex items-start gap-2 ${
                  result.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className="font-medium">{result.message}</p>
                  {result.backupPath && (
                    <p className="text-xs mt-1 opacity-75">
                      {t('mcp.backupCreated')}: {result.backupPath}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={() => handleAutoConfigure(client)}
              disabled={isLoading || !bridgeStatus.running}
              variant="primary"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('mcp.configuring')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t('mcp.autoConfigure')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('mcp.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('mcp.description')}</p>
      </div>

      {/* Connection Status */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {bridgeStatus.running ? (
              <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('mcp.bridgeStatus.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {bridgeStatus.running ? (
                  <>
                    {t('mcp.bridgeStatus.running')}{' '}
                    <span className="font-medium">
                      {t('mcp.bridgeStatus.port', { port: bridgeStatus.port })}
                    </span>
                  </>
                ) : (
                  t('mcp.bridgeStatus.notRunning')
                )}
              </p>
            </div>
          </div>
          <Button onClick={loadBridgeStatus} variant="secondary" size="sm">
            {t('mcp.refresh')}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      {!bridgeStatus.running && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">{t('mcp.warnings.bridgeNotRunning')}</p>
            <p className="text-xs opacity-90">{t('mcp.warnings.bridgeNotRunningDescription')}</p>
          </div>
        </div>
      )}

      {/* Auto-Configuration Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('mcp.autoConfig.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('mcp.autoConfig.description')}
        </p>

        <div className="space-y-4">
          {renderClientCard(
            'claude-desktop',
            <Download className="w-6 h-6" />,
            t('mcp.clients.claudeDesktop.description')
          )}
          {renderClientCard(
            'claude-code',
            <Download className="w-6 h-6" />,
            t('mcp.clients.claudeCode.description')
          )}
          {renderClientCard(
            'cursor',
            <Download className="w-6 h-6" />,
            t('mcp.clients.cursor.description')
          )}
        </div>
      </div>

      {/* Manual Configuration Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('mcp.manualConfig.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('mcp.manualConfig.description')}
        </p>

        {/* Client Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mcp.manualConfig.selectClient')}
          </label>
          <div className="flex gap-2">
            {(['claude-desktop', 'claude-code', 'cursor'] as MCPClient[]).map((client) => (
              <button
                key={client}
                onClick={() => setManualConfigClient(client)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  manualConfigClient === client
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {client
                  .split('-')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Config Display */}
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
            {manualConfig}
          </pre>
          <Button
            onClick={handleCopyConfig}
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2"
          >
            <Copy className="w-4 h-4 mr-2" />
            {t('mcp.copyConfig')}
          </Button>
        </div>

        {/* Manual Instructions Link */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">{t('mcp.manualConfig.needHelp')}</p>
              <p className="text-xs">{t('mcp.manualConfig.readDocs')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPIntegration;
