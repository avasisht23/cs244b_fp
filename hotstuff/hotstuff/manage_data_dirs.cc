#include "hotstuff/manage_data_dirs.h"

#include "utils/save_load_xdr.h"

#include <filesystem>
#include <system_error>

#include "config.h"

namespace hotstuff {

using utils::mkdir_safe;

std::string hotstuff_index_lmdb_dir(std::string data_dir) {
	// return std::string(ROOT_DB_DIRECTORY) + std::string(HOTSTUFF_INDEX);
	return std::string(data_dir) + std::string(HOTSTUFF_INDEX);
}

std::string hotstuff_block_data_dir(std::string data_dir) {
	// return std::string(ROOT_DB_DIRECTORY) + std::string(HOTSTUFF_BLOCKS);
	return std::string(data_dir) + std::string(HOTSTUFF_BLOCKS);
}

void make_hotstuff_dirs(std::string data_dir) {
	std::cout << ROOT_DB_DIRECTORY << std::endl;
	std::cout << "hello" << std::endl;
	// mkdir_safe(ROOT_DB_DIRECTORY);
	mkdir_safe(data_dir.c_str());
	// auto path = hotstuff_block_data_dir();
	auto path = hotstuff_block_data_dir(data_dir);
	mkdir_safe(path.c_str());
	std::cout << path.c_str() << std::endl;
	// path = hotstuff_index_lmdb_dir();
	path = hotstuff_index_lmdb_dir(data_dir);
	mkdir_safe(path.c_str());
}

void clear_hotstuff_dirs(std::string data_dir) {
	// auto path = hotstuff_block_data_dir();
	auto path = hotstuff_block_data_dir(data_dir);
	std::error_code ec;
	std::filesystem::remove_all({path}, ec);
	if (ec) {
		throw std::runtime_error("failed to clear hotstuff block dir");
	}

	// path = hotstuff_index_lmdb_dir();
	path = hotstuff_index_lmdb_dir(data_dir);
	std::filesystem::remove_all({path}, ec);
	if (ec) {
		throw std::runtime_error("failed to clear hotstuff index lmdb dir");
	}
}

void clear_all_data_dirs(std::string data_dir) {
	clear_hotstuff_dirs(data_dir);
}

void make_all_data_dirs(std::string data_dir) {
	make_hotstuff_dirs(data_dir);
}

} /* speedex */
