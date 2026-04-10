import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useAuthedFetcher, useBackendApi } from '@/hooks/fetch';
import { useAdminPerms } from '@/hooks/auth';
import { txToast } from '@/components/txToaster';
import { resetAddonCache } from '@/hooks/addons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PackageIcon, ShieldCheckIcon, ShieldXIcon, PowerIcon, RefreshCwIcon, AlertTriangleIcon } from 'lucide-react';
import type { AddonListItem } from '@shared/addonTypes';

interface AddonsListResponse {
    addons: AddonListItem[];
    config: {
        enabled: boolean;
        maxAddons: number;
        maxStorageMb: number;
    };
    error?: string;
}

const stateColors: Record<string, string> = {
    running: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/25',
    discovered: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/25',
    approved: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
    stopped: 'bg-muted text-muted-foreground border-border',
    failed: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    crashed: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    starting: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
    stopping: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/25',
    invalid: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    validating: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
};

function StateBadge({ state }: { state: string }) {
    return (
        <Badge variant="outline" className={stateColors[state] ?? ''}>
            {state}
        </Badge>
    );
}

function AddonCard({
    addon,
    onApprove,
    onRevoke,
    isReadOnly,
}: {
    addon: AddonListItem;
    onApprove: (addon: AddonListItem) => void;
    onRevoke: (addonId: string) => void;
    isReadOnly: boolean;
}) {
    const needsApproval = addon.state === 'discovered';

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <PackageIcon className="text-muted-foreground h-5 w-5 shrink-0" />
                        <div>
                            <CardTitle className="text-base">{addon.name}</CardTitle>
                            <CardDescription className="text-xs">
                                v{addon.version} by {addon.author}
                            </CardDescription>
                        </div>
                    </div>
                    <StateBadge state={addon.state} />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">{addon.description}</p>

                {/* Permissions display */}
                {(addon.permissions.required.length > 0 || addon.permissions.optional.length > 0) && (
                    <div className="space-y-1">
                        <p className="text-xs font-medium">Permissions:</p>
                        <div className="flex flex-wrap gap-1">
                            {addon.permissions.required.map((p) => (
                                <Badge key={p} variant="secondary" className="text-2xs">
                                    {p}
                                    <span className="text-destructive-inline ml-0.5">*</span>
                                </Badge>
                            ))}
                            {addon.permissions.optional.map((p) => (
                                <Badge key={p} variant="outline" className="text-2xs">
                                    {p}
                                    {addon.permissions.granted.includes(p) && (
                                        <ShieldCheckIcon className="ml-0.5 h-3 w-3 text-green-500" />
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {!isReadOnly && (
                    <div className="flex gap-2 pt-1">
                        {needsApproval && (
                            <Button size="sm" onClick={() => onApprove(addon)}>
                                <ShieldCheckIcon className="mr-1 h-4 w-4" />
                                Approve
                            </Button>
                        )}
                        {addon.state === 'running' && (
                            <Button size="sm" variant="destructive" onClick={() => onRevoke(addon.id)}>
                                <ShieldXIcon className="mr-1 h-4 w-4" />
                                Revoke
                            </Button>
                        )}
                        {(addon.state === 'failed' || addon.state === 'crashed') && (
                            <>
                                <Button size="sm" variant="outline" onClick={() => onApprove(addon)}>
                                    <RefreshCwIcon className="mr-1 h-4 w-4" />
                                    Re-approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => onRevoke(addon.id)}>
                                    <ShieldXIcon className="mr-1 h-4 w-4" />
                                    Revoke
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AddonsPage() {
    const { hasPerm } = useAdminPerms();
    const isReadOnly = !hasPerm('all_permissions');
    const fetcher = useAuthedFetcher();
    const addonApi = useBackendApi<any>({
        method: 'POST',
        path: '',
    });

    const { data, error, isLoading, mutate } = useSWR<AddonsListResponse>(
        '/addons/list',
        (url: string) => fetcher(url),
        { refreshInterval: 10_000 },
    );

    // Approval dialog state
    const [approvalTarget, setApprovalTarget] = useState<AddonListItem | null>(null);
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    const handleOpenApproval = useCallback((addon: AddonListItem) => {
        setApprovalTarget(addon);
        // Pre-select all required + all optional
        setSelectedPerms([...addon.permissions.required, ...addon.permissions.optional]);
    }, []);

    const handleApprove = useCallback(async () => {
        if (!approvalTarget) return;
        try {
            const resp = await fetcher(`/addons/${approvalTarget.id}/approve`, {
                method: 'POST',
                body: { permissions: selectedPerms },
            });
            if (resp.error) {
                txToast.error(resp.error);
            } else {
                txToast.success(`Addon "${approvalTarget.name}" approved. Restart required.`);
                resetAddonCache();
                mutate();
            }
        } catch (err) {
            txToast.error(`Failed to approve addon: ${(err as Error).message}`);
        }
        setApprovalTarget(null);
    }, [approvalTarget, selectedPerms, fetcher, mutate]);

    const handleRevoke = useCallback(async (addonId: string) => {
        try {
            const resp = await fetcher(`/addons/${addonId}/revoke`, { method: 'POST' });
            if (resp.error) {
                txToast.error(resp.error);
            } else {
                txToast.success('Addon revoked. Restart required.');
                resetAddonCache();
                mutate();
            }
        } catch (err) {
            txToast.error(`Failed to revoke addon: ${(err as Error).message}`);
        }
    }, [fetcher, mutate]);

    const togglePerm = useCallback((perm: string) => {
        setSelectedPerms((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
        );
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-8">
                <AlertTriangleIcon className="h-8 w-8 text-destructive" />
                <p className="text-destructive">Failed to load addons.</p>
            </div>
        );
    }

    const addons = data?.addons ?? [];

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-2">
                <Badge variant={data?.config?.enabled ? 'default' : 'secondary'}>
                    <PowerIcon className="mr-1 h-3 w-3" />
                    {data?.config?.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {data?.config && (
                    <span className="text-muted-foreground text-xs">
                        {addons.length}/{data.config.maxAddons} addons
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="text-muted-foreground py-12 text-center">Loading addons...</div>
            )}

            {!isLoading && addons.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12">
                        <PackageIcon className="text-muted-foreground h-12 w-12" />
                        <p className="text-muted-foreground text-sm">
                            No addons installed. Place addon folders in the <code>addons/</code> directory.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {addons.map((addon) => (
                    <AddonCard
                        key={addon.id}
                        addon={addon}
                        onApprove={handleOpenApproval}
                        onRevoke={handleRevoke}
                        isReadOnly={isReadOnly}
                    />
                ))}
            </div>

            {/* Approval Dialog */}
            <Dialog open={!!approvalTarget} onOpenChange={(open) => !open && setApprovalTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Addon: {approvalTarget?.name}</DialogTitle>
                        <DialogDescription>
                            Review and grant permissions for this addon. Required permissions are marked with *.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {approvalTarget?.permissions.required.map((perm) => (
                            <div key={perm} className="flex items-center gap-2">
                                <Checkbox id={`perm-${perm}`} checked disabled />
                                <Label htmlFor={`perm-${perm}`} className="text-sm">
                                    {perm} <span className="text-destructive">*required</span>
                                </Label>
                            </div>
                        ))}
                        {approvalTarget?.permissions.optional.map((perm) => (
                            <div key={perm} className="flex items-center gap-2">
                                <Checkbox
                                    id={`perm-${perm}`}
                                    checked={selectedPerms.includes(perm)}
                                    onCheckedChange={() => togglePerm(perm)}
                                />
                                <Label htmlFor={`perm-${perm}`} className="text-sm">
                                    {perm}
                                </Label>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApprovalTarget(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApprove}>
                            <ShieldCheckIcon className="mr-1 h-4 w-4" />
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
