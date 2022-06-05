#pragma once

#include "hotstuff/xdr/hotstuff.h"

#include <optional>

namespace hotstuff {

std::string
block_filename(const HotstuffBlockWire& block, const char* data_dir);

std::string
block_filename(const Hash& header_hash, const char* data_dir);

void save_block(const HotstuffBlockWire& block, const char* data_dir);

std::optional<HotstuffBlockWire>
load_block(const Hash& req_header_hash, const char* data_dir);

void make_block_folder(const char* data_dir);

} /* hotstuff */
