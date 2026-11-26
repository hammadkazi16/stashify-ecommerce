
/**
 * Seller dashboard API. Mounted from index.js with shared auth helpers.
 * Every mutating route checks ownership before touching a product.
 */
export function registerSellerRoutes(app, deps) {
  const {
    auth, wrap, load, save, publicUser, getCollection, storeMode,
    allProducts, getProduct, productsBySeller, normaliseProduct,
    createProduct, updateProduct, removeProduct, sellerStats,
    deleteImage,
    createImageUploadSignature,
    verifyUploadedImage
  } = deps;

  const db = load();

  const requireSeller = (req, res, next) => {
    if (!req.user?.seller) {
      return res.status(403).json({
        error: 'Create a seller account first.',
        needsSeller: true
      });
    }
    next();
  };

  
  const owned = async (req, res) => {
    const p = await getProduct(req.params.id);

    if (!p) {
      res.status(404).json({ error: 'Product not found.' });
      return null;
    }

    if (p.sellerId !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({
        error: 'That product belongs to another seller.'
      });
      return null;
    }

    return p;
  };


  /* ----------------------------- onboarding ----------------------------- */

  
  app.post('/api/seller/apply', auth(), wrap(async (req, res) => {
    const storeName = String(req.body.storeName || '').trim();
    const gstin = String(req.body.gstin || '').trim().toUpperCase();
    const description = String(req.body.description || '').trim().slice(0, 600);

    if (storeName.length < 3) {
      return res.status(400).json({
        error: 'Store name needs at least 3 characters.'
      });
    }

    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return res.status(400).json({
        error: 'GSTIN looks invalid. Leave it blank if you do not have one.'
      });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        error: 'Verify your email before opening a store.'
      });
    }

    if (storeMode() === 'mongo') {
      const existingStore = await getCollection('users').findOne({
        id: { $ne: req.user.id },
        $expr: {
          $eq: [
            { $toLower: { $ifNull: ['$seller.storeName', ''] } },
            storeName.toLowerCase()
          ]
        }
      });

      if (existingStore) {
        return res.status(409).json({
          error: 'A store with that name already exists.'
        });
      }
    } else if (db.users.some((u) =>
      u.seller?.storeName?.toLowerCase() === storeName.toLowerCase() &&
      u.id !== req.user.id
    )) {
      return res.status(409).json({
        error: 'A store with that name already exists.'
      });
    }

    req.user.seller = {
      storeName: storeName.slice(0, 60),
      gstin,
      description,
      since: Date.now(),
      status: 'active'
    };

    if (storeMode() === 'mongo') {
      await getCollection('users').updateOne(
        { id: req.user.id },
        { $set: { seller: req.user.seller } }
      );
    } else {
      await save();
    }

    res.json({ ok: true, user: publicUser(req.user) });
  }));


  app.get('/api/seller/me', auth(), requireSeller, wrap(async (req, res) => {
  res.json({
    seller: req.user.seller,
    stats: await sellerStats(req.user.id)
  });
}));

  
  app.put('/api/seller/me', auth(), requireSeller, wrap(async (req, res) => {
    const storeName = String(
      req.body.storeName ?? req.user.seller.storeName
    ).trim();

    if (storeName.length < 3) {
      return res.status(400).json({
        error: 'Store name needs at least 3 characters.'
      });
    }

    const description = String(
      req.body.description ?? req.user.seller.description
    ).trim().slice(0, 600);

    if (storeMode() === 'mongo') {
      const existingStore = await getCollection('users').findOne({
        id: { $ne: req.user.id },
        $expr: {
          $eq: [
            { $toLower: { $ifNull: ['$seller.storeName', ''] } },
            storeName.toLowerCase()
          ]
        }
      });

      if (existingStore) {
        return res.status(409).json({
          error: 'A store with that name already exists.'
        });
      }
    } else if (db.users.some((u) =>
      u.seller?.storeName?.toLowerCase() === storeName.toLowerCase() &&
      u.id !== req.user.id
    )) {
      return res.status(409).json({
        error: 'A store with that name already exists.'
      });
    }

    req.user.seller.storeName = storeName.slice(0, 60);
    req.user.seller.description = description;

    if (storeMode() === 'mongo') {
      await getCollection('users').updateOne(
        { id: req.user.id },
        { $set: { seller: req.user.seller } }
      );

      await getCollection('products').updateMany(
        { sellerId: req.user.id },
        { $set: { sellerName: req.user.seller.storeName } }
      );
    } else {
      const products = await productsBySeller(req.user.id);

      products.forEach((p) => {
        p.sellerName = req.user.seller.storeName;
      });

      await save();
    }

    res.json({
      ok: true,
      seller: req.user.seller
    });
  }));


  /* ------------------------------ products ------------------------------ */

  app.get('/api/seller/products', auth(), requireSeller, wrap(async (req, res) => {
  const list =
    req.user.isAdmin && req.query.all === '1'
      ? await allProducts()
      : await productsBySeller(req.user.id);

  res.json(list);
}));

  app.post('/api/seller/products', auth(), requireSeller, wrap(async (req, res) => {
    const fields = normaliseProduct(req.body);
    const product = await createProduct(fields, req.user);

    res.status(201).json(product);
  }));

  app.get('/api/seller/products/:id', auth(), requireSeller, wrap(async (req, res) => {
  const p = await owned(req, res);
  if (p) res.json(p);
}));

  app.put('/api/seller/products/:id', auth(), requireSeller, wrap(async (req, res) => {
    const p = await owned(req, res);
    if (!p) return;

    const fields = normaliseProduct(req.body, p);

    if (fields.status === 'active' && !p.images?.length) {
      return res.status(400).json({
        error: 'Add at least one photo before publishing this product.'
      });
    }

    res.json(await updateProduct(p, fields));
  }));

  app.delete('/api/seller/products/:id', auth(), requireSeller, wrap(async (req, res) => {
    const p = await owned(req, res);
    if (!p) return;

    const inOrders = storeMode() === 'mongo'
      ? Boolean(await getCollection('orders').findOne({ 'items.productId': p.id }))
      : db.orders.some((o) => o.items.some((i) => i.productId === p.id));

    if (inOrders) {
      await updateProduct(p, { status: 'archived' });

      return res.json({
        ok: true,
        archived: true,
        message: 'Product has past orders, so it was archived instead of deleted.'
      });
    }

    await Promise.allSettled(
      (p.images || [])
        .filter((i) => !i.seed)
        .map(deleteImage)
    );

    await removeProduct(p);

    res.json({ ok: true, deleted: true });
  }));

  /* ------------------------------- images ------------------------------- */

  /**
   * Step 1:
   * Authorize one direct browser upload to Cloudinary.
   */
  app.post(
    '/api/seller/products/:id/images/sign',
    auth(),
    requireSeller,
    wrap(async (req, res) => {
      const p = await owned(req, res);
      if (!p) return;

      if ((p.images?.length || 0) >= 10) {
        return res.status(400).json({
          error: 'A product can have at most 10 photos.'
        });
      }

      const signed = createImageUploadSignature(p.id);

      res.json(signed);
    })
  );

  /**
   * Step 2:
   * Verify the Cloudinary upload and register its metadata.
   */
  app.post(
    '/api/seller/products/:id/images/confirm',
    auth(),
    requireSeller,
    wrap(async (req, res) => {
      const p = await owned(req, res);
      if (!p) return;

      const { result, publicId } = req.body || {};

      if (!result || typeof result !== 'object' || !publicId) {
        return res.status(400).json({
          error: 'Missing Cloudinary upload details.'
        });
      }

      if ((p.images?.length || 0) >= 10) {
        return res.status(400).json({
          error: 'A product can have at most 10 photos.'
        });
      }

      const expectedPrefix = `stashify/products/${p.id}/`;

      if (
        typeof publicId !== 'string' ||
        !publicId.startsWith(expectedPrefix) ||
        publicId.length > 250
      ) {
        return res.status(400).json({
          error: 'Invalid product image identifier.'
        });
      }

      if (
        (p.images || []).some((image) => image.publicId === publicId)
      ) {
        return res.status(409).json({
          error: 'This image has already been added.'
        });
      }

      const image = await verifyUploadedImage(result, publicId);

      if (storeMode() === 'mongo') {
  const result = await getCollection('products').updateOne(
    {
      id: p.id,
      'images.publicId': { $ne: publicId },
      $expr: {
        $lt: [
          { $size: { $ifNull: ['$images', []] } },
          10
        ]
      }
    },
    {
      $push: { images: image },
      $set: { updatedAt: Date.now() }
    }
  );

  if (!result.modifiedCount) {
    await deleteImage(image);

    return res.status(409).json({
      error: 'The image was already added or the photo limit has been reached.'
    });
  }

  const updatedProduct = await getProduct(p.id);

  return res.json({
    product: updatedProduct,
    added: [image],
    failed: []
  });
}

p.images = [...(p.images || []), image];
p.updatedAt = Date.now();

await save();

      res.json({
        product: p,
        added: [image],
        failed: []
      });
    })
  );

  /**
   * Delete an individual image.
   */
  app.delete(
    '/api/seller/products/:id/images/:imageId',
    auth(),
    requireSeller,
    wrap(async (req, res) => {
      const p = await owned(req, res);
      if (!p) return;

      const img = (p.images || []).find(
        (i) => i.id === req.params.imageId
      );

      if (!img) {
        return res.status(404).json({
          error: 'Photo not found.'
        });
      }

      if (p.images.length === 1 && p.status === 'active') {
        return res.status(400).json({
          error: 'A published product needs at least one photo. Add another or unpublish first.'
        });
      }

      
if (storeMode() === 'mongo') {
  const result = await getCollection('products').updateOne(
    {
      id: p.id,
      'images.id': img.id,
      $or: [
        { status: { $ne: 'active' } },
        {
          $expr: {
            $gt: [
              { $size: { $ifNull: ['$images', []] } },
              1
            ]
          }
        }
      ]
    },
    {
      $pull: { images: { id: img.id } },
      $set: { updatedAt: Date.now() }
    }
  );

  if (!result.modifiedCount) {
    return res.status(409).json({
      error: 'The photo could not be removed. Refresh the product and try again.'
    });
  }

  if (!img.seed) {
    try {
      await deleteImage(img);
    } catch (error) {
      console.error('Cloudinary image cleanup failed:', error.message);
    }
  }

  return res.json(await getProduct(p.id));
}

p.images = p.images.filter((i) => i.id !== img.id);
p.updatedAt = Date.now();

await save();

if (!img.seed) {
  await deleteImage(img);
}


      res.json(p);
    })
  );

  /**
   * Reorder product images.
   */
  app.put(
    '/api/seller/products/:id/images/order',
    auth(),
    requireSeller,
    wrap(async (req, res) => {
      const p = await owned(req, res);
      if (!p) return;

      const order = Array.isArray(req.body.order)
        ? req.body.order
        : [];

      const map = new Map(
        (p.images || []).map((i) => [i.id, i])
      );

      const next = order
        .map((id) => map.get(id))
        .filter(Boolean);

      for (const img of p.images || []) {
        if (!next.includes(img)) next.push(img);
      }

      if (storeMode() === 'mongo') {
  await getCollection('products').updateOne(
    { id: p.id },
    {
      $set: {
        images: next,
        updatedAt: Date.now()
      }
    }
  );

  return res.json(await getProduct(p.id));
}

p.images = next;
p.updatedAt = Date.now();

await save();

      res.json(p);
    })
  );

  /**
   * Set a product image as the cover.
   */
  
  app.put(
    '/api/seller/products/:id/images/:imageId/primary',
    auth(),
    requireSeller,
    wrap(async (req, res) => {
      const p = await owned(req, res);
      if (!p) return;

      const img = (p.images || []).find(
        (i) => i.id === req.params.imageId
      );

      if (!img) {
        return res.status(404).json({
          error: 'Photo not found.'
        });
      }

      const images = [
        img,
        ...p.images.filter((i) => i.id !== img.id)
      ];

      if (storeMode() === 'mongo') {
        await getCollection('products').updateOne(
          { id: p.id },
          {
            $set: {
              images,
              updatedAt: Date.now()
            }
          }
        );

        return res.json(await getProduct(p.id));
      }

      p.images = images;
      p.updatedAt = Date.now();

      await save();

      res.json(p);
    })
  );

  /* -------------------------------- orders ------------------------------ */

  app.get('/api/seller/orders', auth(), requireSeller, wrap(async (req, res) => {
  const stats = await sellerStats(req.user.id);
  res.json(stats.recentOrders);
}));

app.get('/api/seller/stats', auth(), requireSeller, wrap(async (req, res) => {
  res.json(await sellerStats(req.user.id));
}));
}
