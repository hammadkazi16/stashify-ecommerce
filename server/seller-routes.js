/**
 * Seller dashboard API. Mounted from index.js with the shared auth helpers.
 * Every mutating route checks ownership (or admin) before touching a product.
 */
export function registerSellerRoutes(app, deps) {
  const {
    auth, wrap, load, save, publicUser,
    allProducts, getProduct, productsBySeller, normaliseProduct,
    createProduct, updateProduct, removeProduct, sellerStats,
    upload, storeImage, deleteImage, uploadErrorHandler, MAX_FILES
  } = deps;

  const db = load();

  const requireSeller = (req, res, next) => {
    if (!req.user?.seller) {
      return res.status(403).json({ error: 'Create a seller account first.', needsSeller: true });
    }
    next();
  };

  const owned = (req, res) => {
    const p = getProduct(req.params.id);
    if (!p) { res.status(404).json({ error: 'Product not found.' }); return null; }
    if (p.sellerId !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({ error: 'That product belongs to another seller.' });
      return null;
    }
    return p;
  };

  /* ----------------------------- onboarding ----------------------------- */
  app.post('/api/seller/apply', auth(), wrap(async (req, res) => {
    const storeName = String(req.body.storeName || '').trim();
    const gstin = String(req.body.gstin || '').trim().toUpperCase();
    const description = String(req.body.description || '').trim().slice(0, 600);
    if (storeName.length < 3) return res.status(400).json({ error: 'Store name needs at least 3 characters.' });
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return res.status(400).json({ error: 'GSTIN looks invalid. Leave it blank if you do not have one.' });
    }
    if (!req.user.emailVerified) return res.status(403).json({ error: 'Verify your email before opening a store.' });
    if (db.users.some((u) => u.seller?.storeName?.toLowerCase() === storeName.toLowerCase() && u.id !== req.user.id)) {
      return res.status(409).json({ error: 'A store with that name already exists.' });
    }
    req.user.seller = {
      storeName: storeName.slice(0, 60),
      gstin,
      description,
      since: Date.now(),
      status: 'active'
    };
    // adopt any products this user already created
    await save();
    res.json({ ok: true, user: publicUser(req.user) });
  }));

  app.get('/api/seller/me', auth(), requireSeller, (req, res) => {
    res.json({ seller: req.user.seller, stats: sellerStats(req.user.id) });
  });

  app.put('/api/seller/me', auth(), requireSeller, wrap(async (req, res) => {
    const storeName = String(req.body.storeName ?? req.user.seller.storeName).trim();
    if (storeName.length < 3) return res.status(400).json({ error: 'Store name needs at least 3 characters.' });
    req.user.seller.storeName = storeName.slice(0, 60);
    req.user.seller.description = String(req.body.description ?? req.user.seller.description).trim().slice(0, 600);
    productsBySeller(req.user.id).forEach((p) => { p.sellerName = req.user.seller.storeName; });
    await save();
    res.json({ ok: true, seller: req.user.seller });
  }));

  /* ------------------------------ products ------------------------------ */
  app.get('/api/seller/products', auth(), requireSeller, (req, res) => {
    const list = req.user.isAdmin && req.query.all === '1' ? allProducts() : productsBySeller(req.user.id);
    res.json(list);
  });

  app.post('/api/seller/products', auth(), requireSeller, wrap(async (req, res) => {
    const fields = normaliseProduct(req.body);
    const product = await createProduct(fields, req.user);
    res.status(201).json(product);
  }));

  app.get('/api/seller/products/:id', auth(), requireSeller, (req, res) => {
    const p = owned(req, res);
    if (p) res.json(p);
  });

  app.put('/api/seller/products/:id', auth(), requireSeller, wrap(async (req, res) => {
    const p = owned(req, res);
    if (!p) return;
    const fields = normaliseProduct(req.body, p);
    if (fields.status === 'active' && !p.images?.length) {
      return res.status(400).json({ error: 'Add at least one photo before publishing this product.' });
    }
    res.json(await updateProduct(p, fields));
  }));

  app.delete('/api/seller/products/:id', auth(), requireSeller, wrap(async (req, res) => {
    const p = owned(req, res);
    if (!p) return;
    const inOrders = db.orders.some((o) => o.items.some((i) => i.productId === p.id));
    if (inOrders) {
      // preserve order history — archive instead of hard delete
      await updateProduct(p, { status: 'archived' });
      return res.json({ ok: true, archived: true, message: 'Product has past orders, so it was archived instead of deleted.' });
    }
    await Promise.allSettled((p.images || []).filter((i) => !i.seed).map(deleteImage));
    await removeProduct(p);
    res.json({ ok: true, deleted: true });
  }));

  /* ------------------------------- images ------------------------------- */
  app.post('/api/seller/products/:id/images',
    auth(), requireSeller,
    (req, res, next) => {
      const p = owned(req, res);
      if (!p) return;
      req.product = p;
      next();
    },
    upload.array('images', MAX_FILES),
    wrap(async (req, res) => {
      const p = req.product;
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'No images received. Attach files under the "images" field.' });
      if ((p.images?.length || 0) + files.length > 10) {
        return res.status(400).json({ error: 'A product can have at most 10 photos.' });
      }
      const added = [], failed = [];
      for (const f of files) {
        try {
          added.push(await storeImage(f.buffer, { prefix: p.id }));
        } catch (e) {
          failed.push({ name: f.originalname, error: e.message });
        }
      }
      if (!added.length) {
        return res.status(400).json({ error: failed[0]?.error || 'None of the files could be processed.' });
      }
      p.images = [...(p.images || []), ...added];
      p.updatedAt = Date.now();
      await save();
      res.json({ product: p, added, failed });
    }),
    uploadErrorHandler
  );

  app.delete('/api/seller/products/:id/images/:imageId', auth(), requireSeller, wrap(async (req, res) => {
    const p = owned(req, res);
    if (!p) return;
    const img = (p.images || []).find((i) => i.id === req.params.imageId);
    if (!img) return res.status(404).json({ error: 'Photo not found.' });
    if (p.images.length === 1 && p.status === 'active') {
      return res.status(400).json({ error: 'A published product needs at least one photo. Add another or unpublish first.' });
    }
    if (!img.seed) await deleteImage(img);
    p.images = p.images.filter((i) => i.id !== img.id);
    p.updatedAt = Date.now();
    await save();
    res.json(p);
  }));

  app.put('/api/seller/products/:id/images/order', auth(), requireSeller, wrap(async (req, res) => {
    const p = owned(req, res);
    if (!p) return;
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    const map = new Map((p.images || []).map((i) => [i.id, i]));
    const next = order.map((id) => map.get(id)).filter(Boolean);
    for (const img of p.images || []) if (!next.includes(img)) next.push(img);
    p.images = next;
    p.updatedAt = Date.now();
    await save();
    res.json(p);
  }));

  app.put('/api/seller/products/:id/images/:imageId/primary', auth(), requireSeller, wrap(async (req, res) => {
    const p = owned(req, res);
    if (!p) return;
    const img = (p.images || []).find((i) => i.id === req.params.imageId);
    if (!img) return res.status(404).json({ error: 'Photo not found.' });
    p.images = [img, ...p.images.filter((i) => i.id !== img.id)];
    p.updatedAt = Date.now();
    await save();
    res.json(p);
  }));

  /* -------------------------------- orders ------------------------------ */
  app.get('/api/seller/orders', auth(), requireSeller, (req, res) => {
    res.json(sellerStats(req.user.id).recentOrders);
  });

  app.get('/api/seller/stats', auth(), requireSeller, (req, res) => {
    res.json(sellerStats(req.user.id));
  });
}
