'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import PermissionGuard from '@/components/PermissionGuard';

interface Backup {
  id: number;
  backup_name: string;
  backup_type: string;
  file_path: string;
  file_size: number;
  created_by_name: string;
  created_at: string;
  metadata: string;
}

interface SystemLog {
  id: number;
  operation_type: string;
  target_type: string;
  target_id?: string;
  performed_by_name: string;
  details: string;
  affected_records: number;
  status: string;
  error_message?: string;
  created_at: string;
}

interface RecoverableData {
  id: number;
  original_table: string;
  original_id: string;
  data_content: string;
  deleted_by_name: string;
  deleted_at: string;
  restore_deadline: string;
}

export default function SystemManagementPage() {
  const [activeTab, setActiveTab] = useState<'backup' | 'reset' | 'logs' | 'recovery'>('backup');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [recoverableData, setRecoverableData] = useState<RecoverableData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // 백업 관련 상태
  const [backupType, setBackupType] = useState<'full' | 'selective'>('full');
  const [selectiveCriteria, setSelectiveCriteria] = useState({
    dateFrom: '',
    dateTo: '',
    userIds: '',
    assessmentTypes: [] as string[],
    includeCache: true
  });

  // 리셋 관련 상태
  const [resetType, setResetType] = useState<'full' | 'selective'>('selective');
  const [resetCriteria, setResetCriteria] = useState({
    dateFrom: '',
    dateTo: '',
    userIds: '',
    assessmentTypes: [] as string[],
    deleteUsers: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 백업 목록 로드
      const backupsResponse = await fetch('/api/system/backup');
      if (backupsResponse.ok) {
        const backupsData = await backupsResponse.json();
        setBackups(backupsData.backups);
      }

      // 로그 및 복구 가능한 데이터 로드
      const logsResponse = await fetch('/api/system/logs');
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs);
        setRecoverableData(logsData.recoverableData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showMessage('데이터 로드에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const createBackup = async () => {
    if (!confirm('백업을 생성하시겠습니까?')) return;

    try {
      setIsLoading(true);
      
      const requestBody: any = { backupType };
      
      if (backupType === 'selective') {
        const criteria: any = {
          includeCache: selectiveCriteria.includeCache
        };
        
        if (selectiveCriteria.dateFrom) criteria.dateFrom = selectiveCriteria.dateFrom;
        if (selectiveCriteria.dateTo) criteria.dateTo = selectiveCriteria.dateTo;
        if (selectiveCriteria.userIds) {
          criteria.userIds = selectiveCriteria.userIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        }
        if (selectiveCriteria.assessmentTypes.length > 0) {
          criteria.assessmentTypes = selectiveCriteria.assessmentTypes;
        }
        
        requestBody.criteria = criteria;
      }

      const response = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        showMessage('백업이 성공적으로 생성되었습니다.', 'success');
        await loadData();
      } else {
        const error = await response.json();
        showMessage(`백업 생성 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      showMessage('백업 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const restoreFromBackup = async (backupId: number) => {
    if (!confirm('이 백업으로 시스템을 복원하시겠습니까? 현재 데이터는 모두 대체됩니다.')) return;

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/system/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId })
      });

      if (response.ok) {
        showMessage('시스템이 성공적으로 복원되었습니다.', 'success');
        await loadData();
      } else {
        const error = await response.json();
        showMessage(`복원 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      showMessage('복원 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSystem = async () => {
    const confirmMessage = resetType === 'full' 
      ? '전체 시스템을 초기화하시겠습니까? 모든 사용자 데이터가 삭제됩니다.'
      : '선택된 조건에 따라 데이터를 삭제하시겠습니까?';
    
    if (!confirm(confirmMessage)) return;

    try {
      setIsLoading(true);
      
      const requestBody: any = { resetType, createBackup: true };
      
      if (resetType === 'selective') {
        const criteria: any = {
          deleteUsers: resetCriteria.deleteUsers
        };
        
        if (resetCriteria.dateFrom) criteria.dateFrom = resetCriteria.dateFrom;
        if (resetCriteria.dateTo) criteria.dateTo = resetCriteria.dateTo;
        if (resetCriteria.userIds) {
          criteria.userIds = resetCriteria.userIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        }
        if (resetCriteria.assessmentTypes.length > 0) {
          criteria.assessmentTypes = resetCriteria.assessmentTypes;
        }
        
        requestBody.criteria = criteria;
      }

      const response = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        showMessage('시스템 초기화가 완료되었습니다.', 'success');
        await loadData();
      } else {
        const error = await response.json();
        showMessage(`초기화 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Reset failed:', error);
      showMessage('초기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/system">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시스템 관리</h1>
            <p className="text-gray-600 mt-1">
              전체 시스템 백업, 복원, 초기화 및 로그 관리
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 새로고침
          </button>
        </div>

        {/* 메시지 */}
        {message && (
          <div className={`p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'backup', name: '백업 관리', icon: '💾' },
              { id: 'reset', name: '시스템 초기화', icon: '🔄' },
              { id: 'logs', name: '작업 로그', icon: '📋' },
              { id: 'recovery', name: '데이터 복구', icon: '🔧' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 백업 관리 탭 */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            {/* 백업 생성 */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">새 백업 생성</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    백업 유형
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="full"
                        checked={backupType === 'full'}
                        onChange={(e) => setBackupType(e.target.value as 'full')}
                        className="mr-2"
                      />
                      전체 백업
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="selective"
                        checked={backupType === 'selective'}
                        onChange={(e) => setBackupType(e.target.value as 'selective')}
                        className="mr-2"
                      />
                      선택적 백업
                    </label>
                  </div>
                </div>

                {backupType === 'selective' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시작 날짜
                      </label>
                      <input
                        type="date"
                        value={selectiveCriteria.dateFrom}
                        onChange={(e) => setSelectiveCriteria(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        종료 날짜
                      </label>
                      <input
                        type="date"
                        value={selectiveCriteria.dateTo}
                        onChange={(e) => setSelectiveCriteria(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        사용자 ID (쉼표로 구분)
                      </label>
                      <input
                        type="text"
                        value={selectiveCriteria.userIds}
                        onChange={(e) => setSelectiveCriteria(prev => ({ ...prev, userIds: e.target.value }))}
                        placeholder="1, 2, 3"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        평가 유형
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectiveCriteria.assessmentTypes.includes('prerequisites')}
                            onChange={(e) => {
                              const types = e.target.checked 
                                ? [...selectiveCriteria.assessmentTypes, 'prerequisites']
                                : selectiveCriteria.assessmentTypes.filter(t => t !== 'prerequisites');
                              setSelectiveCriteria(prev => ({ ...prev, assessmentTypes: types }));
                            }}
                            className="mr-2"
                          />
                          사전요구사항
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectiveCriteria.assessmentTypes.includes('technical')}
                            onChange={(e) => {
                              const types = e.target.checked 
                                ? [...selectiveCriteria.assessmentTypes, 'technical']
                                : selectiveCriteria.assessmentTypes.filter(t => t !== 'technical');
                              setSelectiveCriteria(prev => ({ ...prev, assessmentTypes: types }));
                            }}
                            className="mr-2"
                          />
                          기술검증
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectiveCriteria.includeCache}
                          onChange={(e) => setSelectiveCriteria(prev => ({ ...prev, includeCache: e.target.checked }))}
                          className="mr-2"
                        />
                        캐시 데이터 포함
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={createBackup}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? '생성 중...' : '백업 생성'}
                </button>
              </div>
            </div>

            {/* 백업 목록 */}
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">백업 목록</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        백업명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        유형
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        크기
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        생성자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        생성일시
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backups.map((backup) => (
                      <tr key={backup.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {backup.backup_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            backup.backup_type === 'full' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {backup.backup_type === 'full' ? '전체' : '선택적'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(backup.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {backup.created_by_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(backup.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => restoreFromBackup(backup.id)}
                            disabled={isLoading}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            복원
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 시스템 초기화 탭 */}
        {activeTab === 'reset' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">시스템 초기화</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">주의사항</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>• 초기화 작업은 되돌릴 수 없습니다.</p>
                      <p>• 자동으로 백업이 생성되지만, 수동 백업을 권장합니다.</p>
                      <p>• 관리자 계정은 보존됩니다.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    초기화 유형
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="selective"
                        checked={resetType === 'selective'}
                        onChange={(e) => setResetType(e.target.value as 'selective')}
                        className="mr-2"
                      />
                      선택적 삭제
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="full"
                        checked={resetType === 'full'}
                        onChange={(e) => setResetType(e.target.value as 'full')}
                        className="mr-2"
                      />
                      전체 초기화
                    </label>
                  </div>
                </div>

                {resetType === 'selective' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시작 날짜
                      </label>
                      <input
                        type="date"
                        value={resetCriteria.dateFrom}
                        onChange={(e) => setResetCriteria(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        종료 날짜
                      </label>
                      <input
                        type="date"
                        value={resetCriteria.dateTo}
                        onChange={(e) => setResetCriteria(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        사용자 ID (쉼표로 구분)
                      </label>
                      <input
                        type="text"
                        value={resetCriteria.userIds}
                        onChange={(e) => setResetCriteria(prev => ({ ...prev, userIds: e.target.value }))}
                        placeholder="1, 2, 3"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        평가 유형
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={resetCriteria.assessmentTypes.includes('prerequisites')}
                            onChange={(e) => {
                              const types = e.target.checked 
                                ? [...resetCriteria.assessmentTypes, 'prerequisites']
                                : resetCriteria.assessmentTypes.filter(t => t !== 'prerequisites');
                              setResetCriteria(prev => ({ ...prev, assessmentTypes: types }));
                            }}
                            className="mr-2"
                          />
                          사전요구사항
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={resetCriteria.assessmentTypes.includes('technical')}
                            onChange={(e) => {
                              const types = e.target.checked 
                                ? [...resetCriteria.assessmentTypes, 'technical']
                                : resetCriteria.assessmentTypes.filter(t => t !== 'technical');
                              setResetCriteria(prev => ({ ...prev, assessmentTypes: types }));
                            }}
                            className="mr-2"
                          />
                          기술검증
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={resetCriteria.deleteUsers}
                          onChange={(e) => setResetCriteria(prev => ({ ...prev, deleteUsers: e.target.checked }))}
                          className="mr-2"
                        />
                        사용자 계정도 삭제 (관리자 제외)
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={resetSystem}
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? '초기화 중...' : '시스템 초기화'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 작업 로그 탭 */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">시스템 작업 로그</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업 유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대상
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수행자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      영향받은 레코드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      실행 시간
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.operation_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.target_type}
                        {log.target_id && ` (${log.target_id})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.performed_by_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.affected_records}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 데이터 복구 탭 */}
        {activeTab === 'recovery' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">복구 가능한 데이터</h2>
              <p className="text-sm text-gray-600 mt-1">
                최근 30일 내 삭제된 데이터 중 복구 가능한 항목들입니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      테이블
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      원본 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      삭제자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      삭제 시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      복구 기한
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recoverableData.map((data) => (
                    <tr key={data.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {data.original_table}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.original_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.deleted_by_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(data.deleted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(data.restore_deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => {
                            // TODO: 개별 데이터 복구 기능 구현
                            alert('개별 데이터 복구 기능은 추후 구현 예정입니다.');
                          }}
                        >
                          복구
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </PermissionGuard>
    </AdminLayout>
  );
}