#pragma once

#include <string>

namespace hotstuff {

std::string hotstuff_index_lmdb_dir(std::string data_dir);
std::string hotstuff_block_data_dir(std::string data_dir);
void make_hotstuff_dirs(std::string data_dir);
void clear_hotstuff_dirs(std::string data_dir);

void clear_all_data_dirs(std::string data_dir);
void make_all_data_dirs(std::string data_dir);

} /* hotstuff */
