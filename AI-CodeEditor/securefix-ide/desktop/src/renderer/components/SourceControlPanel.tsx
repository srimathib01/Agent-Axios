import React, { useEffect, useState, useCallback } from 'react';
import { getGitStatus, GitFileStatus, resolveFilePath, fileExists } from '../services/repositoryService';
import { RefreshCw, FileCode2, GitBranchPlus, FilePlus2, FileMinus2, FilePenLine } from 'lucide-react';

interface SourceControlPanelProps {
    repositoryPath: string;
    onFileClick: (path: string) => void;
    onRefresh?: () => void;
}

const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
    repositoryPath,
    onFileClick,
    onRefresh,
}) => {
    const [gitStatus, setGitStatus] = useState<GitFileStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commitMessage, setCommitMessage] = useState('');

    const fetchGitStatus = useCallback(async () => {
        if (!repositoryPath) return;

        setIsLoading(true);
        setError(null);
        try {
            const status = await getGitStatus(repositoryPath);
            setGitStatus(status);
        } catch (err) {
            console.error('Error fetching git status:', err);
            setError('Failed to load git status');
        } finally {
            setIsLoading(false);
        }
    }, [repositoryPath]);

    useEffect(() => {
        fetchGitStatus();
    }, [fetchGitStatus]);

    const handleRefresh = () => {
        fetchGitStatus();
        if (onRefresh) onRefresh();
    };

    const handleFileClick = async (status: GitFileStatus) => {
        // Only attempt to open if the file is not deleted
        if (status.status.includes('D')) {
            alert('This file has been deleted.');
            return;
        }

        const fullPath = resolveFilePath(repositoryPath, status.path);
        const exists = await fileExists(fullPath);
        if (exists) {
            onFileClick(fullPath);
        } else {
            alert('File no longer exists or cannot be read.');
        }
    };

    const renderBadge = (status: string) => {
        const isModified = status.includes('M');
        const isAdded = status.includes('A') || status.includes('?');
        const isDeleted = status.includes('D');

        if (isAdded) return (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded" title="Added">
                <FilePlus2 className="w-3 h-3" strokeWidth={2.5} />
            </span>
        );
        if (isDeleted) return (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-red-500/10 text-red-500 text-[10px] font-bold rounded" title="Deleted">
                <FileMinus2 className="w-3 h-3" strokeWidth={2.5} />
            </span>
        );
        if (isModified) return (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded" title="Modified">
                <FilePenLine className="w-3 h-3" strokeWidth={2.5} />
            </span>
        );

        return <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-gray-500/10 text-gray-400 text-[10px] font-bold rounded">{status.trim()}</span>;
    };

    return (
        <div className="source-control-panel flex flex-col h-full bg-[#12141C]">
            <div className="panel-header px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#222533] bg-[#0F111A] flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <GitBranchPlus className="w-3 h-3" />
                    <span>SOURCE CONTROL</span>
                </div>
                <button
                    className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27] transition-colors"
                    onClick={handleRefresh}
                    title="Refresh (F5)"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Commit Input Box */}
            <div className="px-3 py-3 border-b border-[#222533] flex flex-col gap-2 shrink-0">
                <textarea
                    placeholder="Message (Ctrl+Enter to commit)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-[#1A1D27] border border-[#2A2E3D] rounded hover:border-[#3c3c3c] focus:border-[#0078d4] text-[13px] text-gray-200 px-2.5 py-2 outline-none transition-colors resize-none h-[68px] placeholder-gray-500"
                />
                <button
                    disabled={commitMessage.trim() === '' || gitStatus.length === 0}
                    className="w-full bg-[#0078d4] hover:bg-[#006cbd] text-white font-medium text-[12px] py-1.5 rounded disabled:opacity-50 disabled:hover:bg-[#0078d4] disabled:cursor-not-allowed transition-colors"
                >
                    Commit
                </button>
            </div>

            <div className="panel-content flex-1 overflow-auto py-2">
                {isLoading && <div className="text-center text-gray-500 py-8 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
                    <span>Analyzing repository...</span>
                </div>}

                {error && <div className="text-center text-red-400 py-8 px-4 text-xs bg-red-500/5 mx-2 rounded border border-red-500/10">
                    {error}
                </div>}

                {!isLoading && !error && gitStatus.length === 0 && (
                    <div className="text-center text-gray-500 py-12 px-4 text-xs flex flex-col items-center">
                        <GitBranchPlus className="w-8 h-8 text-gray-700 mb-3" strokeWidth={1} />
                        <span className="font-medium text-gray-400 mb-1">No pending changes</span>
                        <span>Your working tree is clean.</span>
                    </div>
                )}

                {!isLoading && !error && gitStatus.length > 0 && (
                    <div className="file-list flex flex-col gap-0.5 px-1">
                        {gitStatus.map((file, i) => (
                            <div
                                key={`${file.path}-${i}`}
                                className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#1A1D27] cursor-pointer text-[13px] text-gray-300 transition-colors"
                                onClick={() => handleFileClick(file)}
                                title={file.path}
                            >
                                <div className="file-name truncate flex-1 flex items-center gap-2.5">
                                    <FileCode2 className="w-4 h-4 text-gray-500 shrink-0" />
                                    <span className="truncate group-hover:text-gray-200 transition-colors">{file.path}</span>
                                </div>
                                <div className="file-status ml-3 shrink-0">
                                    {renderBadge(file.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                /* SourceControlPanel custom styles cleaned */
            `}</style>
        </div>
    );
};

export default SourceControlPanel;
