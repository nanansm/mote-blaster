import { Router } from 'express';
import multer from 'multer';
import { campaignController } from '../controllers/campaign.controller';
import { authMiddleware, checkPlanLimit } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All routes require authentication
router.use(authMiddleware);

router.get('/', checkPlanLimit, campaignController.listCampaigns);
router.post('/', checkPlanLimit, campaignController.createCampaign);
router.get('/:id', checkPlanLimit, campaignController.getCampaign);
router.put('/:id', checkPlanLimit, campaignController.updateCampaign);
router.delete('/:id', checkPlanLimit, campaignController.deleteCampaign);
router.post('/:id/start', checkPlanLimit, campaignController.startCampaign);
router.post('/:id/pause', checkPlanLimit, campaignController.pauseCampaign);
router.get('/:id/logs', checkPlanLimit, campaignController.getCampaignLogs);
router.get('/:id/export', checkPlanLimit, campaignController.exportCampaignLogs);
router.post('/upload-csv', checkPlanLimit, upload.single('file'), campaignController.uploadCSV);
router.post('/fetch-sheet', checkPlanLimit, campaignController.fetchSheet);

export default router;
