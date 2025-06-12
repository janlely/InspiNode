// @ts-ignore
import SQLite from 'react-native-sqlite-storage';
import { IdeaRecord, NewIdea, UpdateIdea, BlockRecord, NewBlock, UpdateBlock, BlockType } from '../Types';

// 启用Promise API
SQLite.enablePromise(true);


class IdeaDatabase {
  private db: any = null;
  private isInitialized = false;
  
  // 当前数据库版本
  private static readonly CURRENT_VERSION = 5;
  
  // 数据库名称
  private static readonly DATABASE_NAME = 'InspiNote.db';

  // 初始化数据库
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabase({
        name: IdeaDatabase.DATABASE_NAME,
        location: 'default',
      });

      // 检查并执行数据库迁移
      await this.checkAndMigrate();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error('数据库初始化失败');
    }
  }

  // 检查数据库版本并执行迁移
  private async checkAndMigrate(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // 获取当前数据库版本
      const currentVersion = await this.getDatabaseVersion();

      if (currentVersion < IdeaDatabase.CURRENT_VERSION) {
        await this.performMigration(currentVersion, IdeaDatabase.CURRENT_VERSION);
        
        // 更新数据库版本
        await this.setDatabaseVersion(IdeaDatabase.CURRENT_VERSION);
      }
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      throw new Error('数据库迁移失败');
    }
  }

  // 获取数据库版本
  private async getDatabaseVersion(): Promise<number> {
    try {
      const result = await this.db.executeSql('PRAGMA user_version;');
      const version = result[0].rows.item(0).user_version;
      return version;
    } catch (error) {
      console.error('❌ Error getting database version:', error);
      return 0; // 如果获取失败，默认为版本0
    }
  }

  // 设置数据库版本
  private async setDatabaseVersion(version: number): Promise<void> {
    try {
      await this.db.executeSql(`PRAGMA user_version = ${version};`);
    } catch (error) {
      console.error('❌ Error setting database version:', error);
      throw error;
    }
  }

  // 执行数据库迁移
  private async performMigration(fromVersion: number, toVersion: number): Promise<void> {
    // 按版本逐步迁移
    for (let version = fromVersion; version < toVersion; version++) {
      await this.migrateToVersion(version + 1);
    }
  }

  // 迁移到特定版本
  private async migrateToVersion(version: number): Promise<void> {
    switch (version) {
      case 1:
        await this.migrateToVersion1();
        break;
      
      // 未来版本的迁移可以在这里添加
      case 2:
        await this.migrateToVersion2();
        break;
      
      case 3:
        await this.migrateToVersion3();
        break;
      
      case 4:
        await this.migrateToVersion4();
        break;
      
      case 5:
        await this.migrateToVersion5();
        break;
      
      default:
        console.warn(`⚠️ Unknown migration version: ${version}`);
    }
  }

  // 迁移到版本1：创建基础表结构
  private async migrateToVersion1(): Promise<void> {
    const createIdeasTable = `
      CREATE TABLE IF NOT EXISTS ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hint TEXT NOT NULL,
        detail TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 创建索引以提高查询性能
    const createDateIndex = `
      CREATE INDEX IF NOT EXISTS idx_ideas_date ON ideas(date);
    `;

    const createCreatedAtIndex = `
      CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at);
    `;

    try {
      await this.db.executeSql(createIdeasTable);
      await this.db.executeSql(createDateIndex);
      await this.db.executeSql(createCreatedAtIndex);
    } catch (error) {
      console.error('❌ Error in version 1 migration:', error);
      throw error;
    }
  }

  // 迁移到版本2：添加分类字段
  private async migrateToVersion2(): Promise<void> {
    const addCategoryColumn = `
      ALTER TABLE ideas ADD COLUMN category TEXT DEFAULT NULL;
    `;
    
    try {
      await this.db.executeSql(addCategoryColumn);
    } catch (error) {
      console.error('❌ Error in version 2 migration:', error);
      throw error;
    }
  }

  // 迁移到版本3：添加格式化日期字段
  private async migrateToVersion3(): Promise<void> {
    const addFormattedDateColumn = `
      ALTER TABLE ideas ADD COLUMN formatted_date TEXT DEFAULT NULL;
    `;
    
    const createFormattedDateIndex = `
      CREATE INDEX IF NOT EXISTS idx_ideas_formatted_date ON ideas(formatted_date);
    `;
    
    try {
      // 添加格式化日期字段
      await this.db.executeSql(addFormattedDateColumn);
      
      // 为现有数据填充格式化日期
      const updateFormattedDates = `
        UPDATE ideas 
        SET formatted_date = date 
        WHERE formatted_date IS NULL;
      `;
      await this.db.executeSql(updateFormattedDates);
      
      // 创建索引
      await this.db.executeSql(createFormattedDateIndex);
    } catch (error) {
      console.error('❌ Error in version 3 migration:', error);
      throw error;
    }
  }

  // 迁移到版本4：添加完成状态字段
  private async migrateToVersion4(): Promise<void> {
    const addCompletedColumn = `
      ALTER TABLE ideas ADD COLUMN completed BOOLEAN DEFAULT FALSE;
    `;
    
    try {
      await this.db.executeSql(addCompletedColumn);
    } catch (error) {
      console.error('❌ Error in version 4 migration:', error);
      throw error;
    }
  }

  // 迁移到版本5：创建blocks表
  private async migrateToVersion5(): Promise<void> {
    const createBlocksTable = `
      CREATE TABLE IF NOT EXISTS blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id TEXT NOT NULL,
        idea_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE,
        UNIQUE(block_id, idea_id)
      );
    `;

    const createBlocksIdeaIdIndex = `
      CREATE INDEX IF NOT EXISTS idx_blocks_idea_id ON blocks(idea_id);
    `;

    const createBlocksOrderIndex = `
      CREATE INDEX IF NOT EXISTS idx_blocks_order ON blocks(idea_id, order_index);
    `;

    try {
      await this.db.executeSql(createBlocksTable);
      await this.db.executeSql(createBlocksIdeaIdIndex);
      await this.db.executeSql(createBlocksOrderIndex);
    } catch (error) {
      console.error('❌ Error in version 5 migration:', error);
      throw error;
    }
  }

  // 确保数据库已初始化
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // 解析查询结果的辅助方法
  private parseQueryResult(result: any): IdeaRecord[] {
    const ideas: IdeaRecord[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      ideas.push(result[0].rows.item(i));
    }
    return ideas;
  }

  // 插入新想法
  async addIdea(idea: NewIdea): Promise<number> {
    await this.ensureInitialized();

    const formattedDate = IdeaDatabase.formatDateToYYYYMMDD(idea.date);

    const insertQuery = `
      INSERT INTO ideas (hint, detail, date, category, formatted_date, completed)
      VALUES (?, ?, ?, ?, ?, ?);
    `;

    try {
      const result = await this.db.executeSql(insertQuery, [
        idea.hint.trim(),
        idea.detail || '',
        idea.date,
        idea.category || null,
        formattedDate,
        idea.completed ? 1 : 0,
      ]);
      
      const insertId = result[0].insertId;
      return insertId;
    } catch (error) {
      console.error('❌ Error adding idea:', error);
      throw new Error('保存想法失败');
    }
  }

  // 更新想法
  async updateIdea(id: number, updates: UpdateIdea): Promise<void> {
    await this.ensureInitialized();

    const fields = [];
    const values = [];

    if (updates.hint !== undefined) {
      fields.push('hint = ?');
      values.push(updates.hint.trim());
    }
    if (updates.detail !== undefined) {
      fields.push('detail = ?');
      values.push(updates.detail);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
      fields.push('formatted_date = ?');
      values.push(IdeaDatabase.formatDateToYYYYMMDD(updates.date));
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `
      UPDATE ideas 
      SET ${fields.join(', ')}
      WHERE id = ?;
    `;

    try {
      const result = await this.db.executeSql(updateQuery, values);
      if (result[0].rowsAffected === 0) {
        console.warn('⚠️ No idea found with ID:', id);
      }
    } catch (error) {
      console.error('❌ Error updating idea:', error);
      throw new Error('更新想法失败');
    }
  }

  // 删除想法
  async deleteIdea(id: number): Promise<void> {
    await this.ensureInitialized();

    const deleteQuery = 'DELETE FROM ideas WHERE id = ?;';

    try {
      const result = await this.db.executeSql(deleteQuery, [id]);
      if (result[0].rowsAffected === 0) {
        console.warn('⚠️ No idea found with ID:', id);
      }
    } catch (error) {
      console.error('❌ Error deleting idea:', error);
      throw new Error('删除想法失败');
    }
  }

  // 获取指定日期的想法
  async getIdeasByDate(date: string): Promise<IdeaRecord[]> {
    await this.ensureInitialized();

    const selectQuery = `
      SELECT * FROM ideas 
      WHERE date = ? 
      ORDER BY created_at ASC;
    `;

    try {
      const result = await this.db.executeSql(selectQuery, [date]);
      return this.parseQueryResult(result);
    } catch (error) {
      console.error('❌ Error fetching ideas by date:', error);
      throw new Error('加载想法失败');
    }
  }

  // 获取指定月份的所有想法（优化版：使用格式化日期字段）
  async getIdeasByMonth(year: number, month: number): Promise<IdeaRecord[]> {
    await this.ensureInitialized();

    const monthPrefix = `${year}${String(month).padStart(2, '0')}`;

    const selectQuery = `
      SELECT * FROM ideas 
      WHERE formatted_date LIKE ? 
      ORDER BY date ASC, created_at ASC;
    `;

    try {
      const result = await this.db.executeSql(selectQuery, [`${monthPrefix}%`]);
      return this.parseQueryResult(result);
    } catch (error) {
      console.error('❌ Error fetching ideas by month:', error);
      throw new Error('加载月份想法失败');
    }
  }

  // 获取所有想法
  async getAllIdeas(): Promise<IdeaRecord[]> {
    await this.ensureInitialized();

    const selectQuery = `
      SELECT * FROM ideas 
      ORDER BY date DESC, created_at DESC;
    `;

    try {
      const result = await this.db.executeSql(selectQuery);
      return this.parseQueryResult(result);
    } catch (error) {
      console.error('❌ Error fetching all ideas:', error);
      throw new Error('加载所有想法失败');
    }
  }

  // 搜索想法
  async searchIdeas(keyword: string): Promise<IdeaRecord[]> {
    await this.ensureInitialized();

    const searchQuery = `
      SELECT * FROM ideas 
      WHERE hint LIKE ? OR detail LIKE ?
      ORDER BY created_at DESC;
    `;

    const searchTerm = `%${keyword.trim()}%`;

    try {
      const result = await this.db.executeSql(searchQuery, [searchTerm, searchTerm]);
      return this.parseQueryResult(result);
    } catch (error) {
      console.error('❌ Error searching ideas:', error);
      throw new Error('搜索想法失败');
    }
  }

  // 获取想法统计信息
  async getStats(): Promise<{ total: number; today: number; thisWeek: number }> {
    await this.ensureInitialized();

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    try {
      // 总数
      const totalResult = await this.db.executeSql('SELECT COUNT(*) as count FROM ideas');
      const total = totalResult[0].rows.item(0).count;

      // 今天
      const todayResult = await this.db.executeSql('SELECT COUNT(*) as count FROM ideas WHERE date = ?', [today]);
      const todayCount = todayResult[0].rows.item(0).count;

      // 本周
      const weekResult = await this.db.executeSql('SELECT COUNT(*) as count FROM ideas WHERE date >= ?', [weekAgoStr]);
      const weekCount = weekResult[0].rows.item(0).count;

      const stats = { total, today: todayCount, thisWeek: weekCount };
      return stats;
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      throw new Error('获取统计信息失败');
    }
  }

  // 获取所有有想法的日期
  async getDatesWithIdeas(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const result = await this.db.executeSql('SELECT DISTINCT date FROM ideas ORDER BY date DESC');
      const dates: string[] = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        dates.push(result[0].rows.item(i).date);
      }
      
      return dates;
    } catch (error) {
      console.error('❌ Error getting dates with ideas:', error);
      throw new Error('获取有想法的日期失败');
    }
  }

  // 获取指定月份有想法的日期（优化版：使用格式化日期字段）
  async getDatesWithIdeasByMonth(year: number, month: number): Promise<string[]> {
    await this.ensureInitialized();

    const monthPrefix = `${year}${String(month).padStart(2, '0')}`;

    try {
      // 使用格式化日期字段进行快速查询
      const result = await this.db.executeSql(
        'SELECT DISTINCT date FROM ideas WHERE formatted_date LIKE ? ORDER BY date ASC',
        [`${monthPrefix}%`]
      );
      const dates: string[] = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        dates.push(result[0].rows.item(i).date);
      }
      
      return dates;
    } catch (error) {
      console.error('❌ Error getting dates with ideas by month:', error);
      
      // 降级到旧的查询方法（兼容性）
      return this.getDatesWithIdeasByMonthFallback(year, month);
    }
  }

  // 降级查询方法（兼容性）
  private async getDatesWithIdeasByMonthFallback(year: number, month: number): Promise<string[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    try {
      const result = await this.db.executeSql(
        'SELECT DISTINCT date FROM ideas WHERE date >= ? AND date <= ? ORDER BY date ASC',
        [startDate, endDate]
      );
      const dates: string[] = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        dates.push(result[0].rows.item(i).date);
      }
      
      return dates;
    } catch (error) {
      console.error('❌ Error in fallback query:', error);
      throw new Error('获取月份想法日期失败');
    }
  }

  // 批量删除空想法
  async cleanupEmptyIdeas(): Promise<number> {
    await this.ensureInitialized();

    const deleteQuery = "DELETE FROM ideas WHERE hint = '' OR hint IS NULL";

    try {
      const result = await this.db.executeSql(deleteQuery);
      const deletedCount = result[0].rowsAffected;
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up empty ideas:', error);
      throw new Error('清理空想法失败');
    }
  }

  // 获取数据库信息（调试用）
  async getDatabaseInfo(): Promise<{ version: number; name: string; tableCount: number }> {
    await this.ensureInitialized();

    try {
      const version = await this.getDatabaseVersion();
      
      // 获取表数量
      const tableResult = await this.db.executeSql(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const tableCount = tableResult[0].rows.item(0).count;

      return {
        version,
        name: IdeaDatabase.DATABASE_NAME,
        tableCount
      };
    } catch (error) {
      console.error('❌ Error getting database info:', error);
      throw new Error('获取数据库信息失败');
    }
  }

  // 关闭数据库连接
  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.isInitialized = false;
      } catch (error) {
        console.error('❌ Error closing database:', error);
        throw new Error('关闭数据库失败');
      }
    }
  }

  // 获取当前日期字符串 (YYYY-MM-DD)
  static getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  // 格式化日期为显示用的中文格式
  static formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('zh-CN', options);
  }

  // 生成格式化日期 (YYYYMMDD)
  static formatDateToYYYYMMDD(dateString: string): string {
    return dateString.replace(/-/g, '');
  }

  // ========================= Block 操作方法 =========================

  // 解析Block查询结果的辅助方法
  private parseBlockQueryResult(result: any): BlockRecord[] {
    const blocks: BlockRecord[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      blocks.push(result[0].rows.item(i));
    }
    return blocks;
  }

  // 获取指定idea的所有blocks
  async getBlocksByIdeaId(ideaId: number): Promise<BlockRecord[]> {
    await this.ensureInitialized();

    const selectQuery = `
      SELECT * FROM blocks 
      WHERE idea_id = ? 
      ORDER BY order_index ASC, created_at ASC;
    `;

    try {
      const result = await this.db.executeSql(selectQuery, [ideaId]);
      const blocks = this.parseBlockQueryResult(result);
      return blocks;
    } catch (error) {
      console.error('❌ Error fetching blocks by idea ID:', error);
      throw new Error('加载Block失败');
    }
  }

  // 插入新block
  async addBlock(block: NewBlock): Promise<number> {
    await this.ensureInitialized();

    const insertQuery = `
      INSERT INTO blocks (idea_id, block_id, type, content, order_index)
      VALUES (?, ?, ?, ?, ?);
    `;

    try {
      const result = await this.db.executeSql(insertQuery, [
        block.idea_id,
        block.block_id,
        block.type,
        block.content,
        block.order_index,
      ]);
      
      const insertId = result[0].insertId;
      return insertId;
    } catch (error) {
      console.error('❌ Error adding block:', error);
      throw new Error('保存Block失败');
    }
  }

  // 更新block
  async updateBlock(ideaId: number, blockId: string, updates: UpdateBlock): Promise<void> {
    await this.ensureInitialized();

    const fields = [];
    const values = [];

    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.order_index !== undefined) {
      fields.push('order_index = ?');
      values.push(updates.order_index);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(ideaId, blockId);

    const updateQuery = `
      UPDATE blocks 
      SET ${fields.join(', ')}
      WHERE idea_id = ? AND block_id = ?;
    `;

    try {
      const result = await this.db.executeSql(updateQuery, values);
      if (result[0].rowsAffected === 0) {
        console.warn('⚠️ No block found with idea_id:', ideaId, 'block_id:', blockId);
      }
    } catch (error) {
      console.error('❌ Error updating block:', error);
      throw new Error('更新Block失败');
    }
  }

  // 删除block
  async deleteBlock(ideaId: number, blockId: string): Promise<void> {
    await this.ensureInitialized();

    const deleteQuery = 'DELETE FROM blocks WHERE idea_id = ? AND block_id = ?;';

    try {
      const result = await this.db.executeSql(deleteQuery, [ideaId, blockId]);
      if (result[0].rowsAffected === 0) {
        console.warn('⚠️ No block found with idea_id:', ideaId, 'block_id:', blockId);
      }
    } catch (error) {
      console.error('❌ Error deleting block:', error);
      throw new Error('删除Block失败');
    }
  }

  // 批量保存blocks（用于自动保存）
  async saveDirtyBlocks(ideaId: number, blocks: { blockId: string; type: BlockType; content: string; orderIndex: number }[]): Promise<void> {
    await this.ensureInitialized();

    if (blocks.length === 0) {
      return;
    }

    try {
      // 开始事务
      await this.db.executeSql('BEGIN TRANSACTION;');

      for (const block of blocks) {
        // 先尝试更新，如果不存在则插入
        const updateQuery = `
          UPDATE blocks 
          SET type = ?, content = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
          WHERE idea_id = ? AND block_id = ?;
        `;

        const updateResult = await this.db.executeSql(updateQuery, [
          block.type,
          block.content,
          block.orderIndex,
          ideaId,
          block.blockId,
        ]);

        // 如果更新没有影响任何行，说明记录不存在，需要插入
        if (updateResult[0].rowsAffected === 0) {
          const insertQuery = `
            INSERT INTO blocks (idea_id, block_id, type, content, order_index)
            VALUES (?, ?, ?, ?, ?);
          `;

          await this.db.executeSql(insertQuery, [
            ideaId,
            block.blockId,
            block.type,
            block.content,
            block.orderIndex,
          ]);
        }
      }

      // 提交事务
      await this.db.executeSql('COMMIT;');
    } catch (error) {
      // 回滚事务
      try {
        await this.db.executeSql('ROLLBACK;');
      } catch (rollbackError) {
        console.error('❌ Error rolling back transaction:', rollbackError);
      }
      
      console.error('❌ Error saving dirty blocks:', error);
      throw new Error('批量保存Block失败');
    }
  }

  // 删除指定idea的所有blocks
  async deleteBlocksByIdeaId(ideaId: number): Promise<number> {
    await this.ensureInitialized();

    const deleteQuery = 'DELETE FROM blocks WHERE idea_id = ?;';

    try {
      const result = await this.db.executeSql(deleteQuery, [ideaId]);
      const deletedCount = result[0].rowsAffected;
      return deletedCount;
    } catch (error) {
      console.error('❌ Error deleting blocks by idea ID:', error);
      throw new Error('删除idea的所有Block失败');
    }
  }
}

// 导出单例实例
export const ideaDB = new IdeaDatabase();

// 导出类本身，以便需要时创建新实例
export default IdeaDatabase; 