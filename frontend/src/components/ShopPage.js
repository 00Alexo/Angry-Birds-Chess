import React, { useState, useEffect } from 'react';
import { 
  IoArrowBack, IoFlash, IoCash, IoTrophy, IoStar, IoGift, 
  IoShield, IoRefresh, IoColorPalette, IoSparkles, IoCart,
  IoCheckmarkCircle, IoLockClosed, IoTime, IoTrendingUp
} from 'react-icons/io5';

const ShopPage = ({ onBack, playerInventory, purchaseShopItem, getDailyDeals }) => {
  const [selectedCategory, setSelectedCategory] = useState('deals');
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [dailyDeals, setDailyDeals] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Load daily deals on component mount
  useEffect(() => {
    const loadDailyDeals = async () => {
      if (getDailyDeals) {
        const deals = await getDailyDeals();
        setDailyDeals(deals);
      }
    };
    loadDailyDeals();
  }, [getDailyDeals]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // Base items (without daily deals)
  const baseShopItems = {
    energy: [
      {
        id: 'energy_refill',
        name: 'Energy Refill',
        description: 'Instantly restore all energy to maximum',
        price: 50,
        icon: <IoFlash className="w-8 h-8 text-yellow-400" />,
        category: 'Energy',
        available: true,
        consumable: true
      },
      {
        id: 'max_energy_upgrade',
        name: 'Max Energy +25',
        description: `Permanently increase max energy (Current: ${playerInventory.maxEnergy || 100}/500)`,
        price: 200,
        icon: <IoCash className="w-8 h-8 text-green-400" />,
        category: 'Energy',
        available: (playerInventory.maxEnergy || 100) < 500,
        permanent: true
      },
      {
        id: 'energy_regen_boost',
        name: 'Fast Regeneration',
        description: '1 energy every 30 seconds for 24 hours',
        price: 150,
        icon: <IoTrendingUp className="w-8 h-8 text-blue-400" />,
        category: 'Energy',
        available: true,
        duration: '24h'
      }
    ],
    campaign: [
      {
        id: 'level_skip',
        name: 'Level Skip Token',
        description: 'Skip any level (awards 1 star automatically)',
        price: 300,
        icon: <IoTrophy className="w-8 h-8 text-gold-400" />,
        category: 'Campaign',
        available: true,
        consumable: true
      },
      {
        id: 'coin_multiplier',
        name: 'Coin Doubler',
        description: '2x coins from next 5 level completions',
        price: 200,
        icon: <IoSparkles className="w-8 h-8 text-amber-400" />,
        category: 'Campaign',
        available: true,
        uses: 5
      }
    ],
    cosmetics: [
      {
        id: 'royal_board',
        name: 'Royal Board Theme',
        description: 'Elegant gold and marble chess board design',
        price: 500,
        icon: <IoColorPalette className="w-8 h-8 text-yellow-600" />,
        category: 'Cosmetics',
        available: true,
        permanent: true,
        owned: playerInventory.ownedItems?.royal_board
      },
      {
        id: 'forest_theme',
        name: 'Forest Theme',
        description: 'Natural wood and leaf pattern board',
        price: 400,
        icon: <IoColorPalette className="w-8 h-8 text-green-600" />,
        category: 'Cosmetics',
        available: true,
        permanent: true,
        owned: playerInventory.ownedItems?.forest_theme
      },
      {
        id: 'space_theme',
        name: 'Space Theme',
        description: 'Cosmic starfield chess board design',
        price: 600,
        icon: <IoColorPalette className="w-8 h-8 text-purple-600" />,
        category: 'Cosmetics',
        available: true,
        permanent: true,
        owned: playerInventory.ownedItems?.space_theme
      }
    ]
  };

  // Helper function to get all base items
  const getAllBaseItems = () => {
    return [
      ...baseShopItems.energy,
      ...baseShopItems.campaign,
      ...baseShopItems.cosmetics
    ];
  };

  // Real shop items with functionality (including dynamic deals)
  const shopItems = {
    ...baseShopItems,
    deals: [
      // Daily deals will be populated from the dailyDeals state
      ...dailyDeals.map(deal => {
        const baseItem = getAllBaseItems().find(item => item.id === deal.itemId);
        return baseItem ? {
          ...baseItem,
          id: `daily_${deal.itemId}`,
          originalId: deal.itemId,
          name: `🔥 ${baseItem.name}`,
          price: deal.discountedPrice,
          originalPrice: deal.originalPrice,
          discount: deal.discount,
          isDailyDeal: true
        } : null;
      }).filter(Boolean),
      // Value packs
      {
        id: 'energy_pack',
        name: 'Energy Starter Pack',
        description: 'Energy refill + max energy upgrade + regen boost',
        price: 320, // 50 + 200 + 150 = 400, but pack is 320 (20% off)
        originalPrice: 400,
        icon: <IoGift className="w-8 h-8 text-orange-400" />,
        category: 'Deals',
        available: true,
        isPack: true,
        contains: ['Energy Refill', 'Max Energy +25', 'Fast Regen 24h']
      },
      {
        id: 'campaign_pack',
        name: 'Campaign Master Pack',
        description: 'Level skip + coin doubler + energy refill',
        price: 440, // 300 + 200 + 50 = 550, but pack is 440 (20% off)
        originalPrice: 550,
        icon: <IoGift className="w-8 h-8 text-purple-400" />,
        category: 'Deals',
        available: true,
        isPack: true,
        contains: ['Level Skip', 'Coin Doubler', 'Energy Refill']
      }
    ]
  };

  const categories = [
    { id: 'deals', name: 'Daily Deals', icon: <IoGift className="w-5 h-5" />, color: 'orange' },
    { id: 'energy', name: 'Energy', icon: <IoFlash className="w-5 h-5" />, color: 'yellow' },
    { id: 'campaign', name: 'Campaign', icon: <IoTrophy className="w-5 h-5" />, color: 'purple' },
    { id: 'cosmetics', name: 'Style', icon: <IoColorPalette className="w-5 h-5" />, color: 'pink' }
  ];

  const handlePurchase = async (item) => {
    if (!purchaseShopItem) {
      console.log(`Mock purchase: ${item.name} for ${item.price} coins`);
      return;
    }

    try {
      const itemId = item.originalId || item.id; // Use original ID for daily deals
      let result;

      if (item.isPack) {
        // Handle pack purchases
        result = await handlePackPurchase(item);
      } else {
        result = await purchaseShopItem(itemId, item.price);
      }
      
      if (result.success) {
        setPurchaseAnimation(item.id);
        showNotification(result.message || `Successfully purchased ${item.name}!`, 'success');
        
        // Reload daily deals if a daily deal was purchased
        if (item.isDailyDeal && getDailyDeals) {
          const newDeals = await getDailyDeals();
          setDailyDeals(newDeals);
        }
        
        setTimeout(() => setPurchaseAnimation(null), 1500);
      } else {
        showNotification(result.message || 'Purchase failed!', 'error');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      showNotification('Purchase failed! Please try again.', 'error');
    }
  };

  // Handle pack purchases
  const handlePackPurchase = async (packItem) => {
    if (packItem.id === 'energy_pack') {
      // Purchase energy refill, max energy upgrade, and regen boost
      const results = [];
      results.push(await purchaseShopItem('energy_refill', 0)); // Free in pack
      results.push(await purchaseShopItem('max_energy_upgrade', 0)); // Free in pack
      results.push(await purchaseShopItem('energy_regen_boost', 0)); // Free in pack
      
      // Deduct pack price
      const finalResult = await purchaseShopItem('energy_pack_coins', packItem.price, { packPurchase: true });
      
      if (finalResult.success) {
        return { success: true, message: 'Energy Starter Pack purchased! All items added to your inventory.' };
      }
    } else if (packItem.id === 'campaign_pack') {
      // Similar logic for campaign pack
      const results = [];
      results.push(await purchaseShopItem('level_skip', 0));
      results.push(await purchaseShopItem('coin_multiplier', 0));
      results.push(await purchaseShopItem('energy_refill', 0));
      
      const finalResult = await purchaseShopItem('campaign_pack_coins', packItem.price, { packPurchase: true });
      
      if (finalResult.success) {
        return { success: true, message: 'Campaign Master Pack purchased! All items added to your inventory.' };
      }
    }
    
    return { success: false, message: 'Pack purchase failed!' };
  };

  const canAfford = (price) => playerInventory.coins >= price;

  const getCategoryColor = (colorName) => {
    const colors = {
      yellow: 'from-yellow-500 to-orange-500',
      purple: 'from-purple-500 to-pink-500',
      orange: 'from-orange-500 to-red-500',
      pink: 'from-pink-500 to-rose-500'
    };
    return colors[colorName] || colors.yellow;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <header className="relative z-10 p-4 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="group flex items-center gap-3 px-6 py-3 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl border border-slate-600/50 transition-all duration-300 hover:scale-105"
          >
            <IoArrowBack className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-lg font-semibold text-slate-300 group-hover:text-white">Back to Menu</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent mb-1">
              ANGRY BIRDS SHOP
            </h1>
            <p className="text-slate-400 text-base">Spend your hard-earned coins wisely!</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-800/40 px-6 py-3 rounded-xl border border-slate-600/30">
            <IoCash className="w-6 h-6 text-yellow-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">{playerInventory.coins.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Coins Available</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto p-4 gap-6">
        {/* Category Sidebar */}
        <div className="w-64 space-y-2">
          <h2 className="text-xl font-bold text-white mb-4 px-2">Categories</h2>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                selectedCategory === category.id
                  ? `bg-gradient-to-r ${getCategoryColor(category.color)} text-white shadow-lg`
                  : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              {category.icon}
              <span className="font-semibold">{category.name}</span>
              <span className="ml-auto text-sm">
                {shopItems[category.id].length}
              </span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white capitalize">
              {selectedCategory} Items
            </h2>
            <div className="text-slate-400 text-sm">
              {shopItems[selectedCategory].length} items available
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItems[selectedCategory].map(item => (
              <div
                key={item.id}
                className={`bg-slate-800/60 rounded-xl border border-slate-600/50 p-6 transition-all duration-300 hover:scale-105 hover:bg-slate-700/60 ${
                  purchaseAnimation === item.id ? 'animate-pulse ring-2 ring-green-400' : ''
                }`}
              >
                {/* Item Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <h3 className="font-bold text-white text-lg">{item.name}</h3>
                      <div className="text-xs text-slate-400">{item.category}</div>
                    </div>
                  </div>
                  {!item.available && <IoLockClosed className="w-5 h-5 text-red-400" />}
                </div>

                {/* Item Description */}
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  {item.description}
                </p>

                {/* Item Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.consumable && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-400/30">
                      One-time use
                    </span>
                  )}
                  {item.permanent && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-400/30">
                      Permanent
                    </span>
                  )}
                  {item.duration && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30">
                      {item.duration}
                    </span>
                  )}
                  {item.uses && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-400/30">
                      {item.uses} uses
                    </span>
                  )}
                  {item.isDailyDeal && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-400/30 animate-pulse">
                      🔥 {item.discount}% OFF
                    </span>
                  )}
                  {item.isPack && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-400/30">
                      💎 Value Pack
                    </span>
                  )}
                  {item.owned && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded-full border border-green-500/30">
                      ✅ Owned
                    </span>
                  )}
                </div>

                {/* Pack contents */}
                {item.isPack && item.contains && (
                  <div className="mb-4 p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="text-xs text-slate-300 mb-1">Pack contains:</div>
                    <div className="flex flex-wrap gap-1">
                      {item.contains.map((content, index) => (
                        <span key={index} className="text-xs text-cyan-300">
                          • {content}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original price for deals */}
                {item.originalPrice && (
                  <div className="mb-2 text-center">
                    <span className="text-sm text-slate-400 line-through">
                      {item.originalPrice.toLocaleString()} coins
                    </span>
                    <span className="text-green-400 font-bold ml-2">
                      Save {item.originalPrice - item.price}!
                    </span>
                  </div>
                )}

                {/* Purchase Section */}
                <div className="border-t border-slate-600/50 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IoCash className="w-5 h-5 text-yellow-400" />
                      <span className="text-xl font-bold text-yellow-400">
                        {item.price.toLocaleString()}
                      </span>
                    </div>

                    {item.available && !item.owned ? (
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford(item.price)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                          canAfford(item.price)
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:scale-105'
                            : 'bg-red-800/50 text-red-300 cursor-not-allowed border border-red-600/50'
                        }`}
                      >
                        <IoCart className="w-4 h-4" />
                        {canAfford(item.price) ? 'Buy Now' : 'Not Enough'}
                      </button>
                    ) : item.owned ? (
                      <div className="px-4 py-2 bg-green-600/20 text-green-300 rounded-lg border border-green-500/30 flex items-center gap-2">
                        <IoCheckmarkCircle className="w-4 h-4" />
                        Owned
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-lg border border-slate-600/50 flex items-center gap-2">
                          <IoLockClosed className="w-4 h-4" />
                          Locked
                        </div>
                        {item.requirement && (
                          <div className="text-xs text-slate-500 mt-1">{item.requirement}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {shopItems[selectedCategory].length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <IoGift className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Coming Soon!</h3>
              <p>More {selectedCategory} items will be added in future updates.</p>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Success Animation */}
      {purchaseAnimation && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-2xl animate-bounce flex items-center gap-3">
            <IoCheckmarkCircle className="w-6 h-6" />
            <span className="font-bold">Purchase Successful!</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full mx-4 ${
          notification.type === 'error' 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : 'bg-gradient-to-r from-green-500 to-green-600'
        } text-white px-6 py-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'error' 
            ? 'border-red-300' 
            : 'border-green-300'
        } animate-slide-down backdrop-blur-sm`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-xl">
              {notification.type === 'error' ? '⚠️' : '✅'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
