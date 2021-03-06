#include "hotstuff/block_storage/io_utils.h"

#include "hotstuff/hotstuff_debug_macros.h"
#include "hotstuff/crypto/hash.h"
#include "utils/save_load_xdr.h"

#include "config.h"

#include <iomanip>
#include <sstream>

namespace hotstuff {

// std::string storage_folder = std::string(ROOT_DB_DIRECTORY) + std::string(HOTSTUFF_BLOCKS);

void
make_block_folder(const char* data_dir) {
	std::string storage_folder = std::string(data_dir) + std::string(HOTSTUFF_BLOCKS);
	utils::mkdir_safe(storage_folder.c_str());
}


std::string 
array_to_str(Hash const& hash) {
	std::stringstream s;
	s.fill('0');
	for (size_t i = 0; i < hash.size(); i++) {
		s<< std::setw(2) << std::hex << (unsigned short)hash[i];
	}
	return s.str();
}

std::string
block_filename(const HotstuffBlockWire& block, const char* data_dir)
{
	auto const& header = block.header;

	auto header_hash = hash_xdr(header);

	return block_filename(header_hash, data_dir);
}

std::string
block_filename(const Hash& header_hash, const char* data_dir)
{
	auto strname = array_to_str(header_hash);
	std::string storage_folder = std::string(data_dir) + std::string(HOTSTUFF_BLOCKS);

	return storage_folder + strname + std::string(".block");
}

void save_block(const HotstuffBlockWire& block, const char* data_dir) {
	auto filename = block_filename(block, data_dir);

	if (utils::save_xdr_to_file(block, filename.c_str()))
	{
		throw std::runtime_error("failed to save file" + filename);
	}
}

std::optional<HotstuffBlockWire> 
load_block(const Hash& req_header_hash, const char* data_dir)
{
	auto filename = block_filename(req_header_hash, data_dir);

	HotstuffBlockWire block;
	if (utils::load_xdr_from_file(block, filename.c_str()))
	{
		return std::nullopt;
	}
	return {block};
}

} /* hotstuff */