import express from 'express';
import { getLinkMetadata, downloadSharedFile } from '../controllers/publicShareController';

const router = express.Router();

router.get('/share/:token', getLinkMetadata);
router.get('/share/:token/download', downloadSharedFile);

export default router;
