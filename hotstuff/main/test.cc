// #include <catch2/catch_session.hpp>
#include <iostream>

#include "hotstuff/vm/counting_vm.h"

#include "hotstuff/config/replica_config.h"
#include "hotstuff/crypto/crypto_utils.h"
#include "hotstuff/manage_data_dirs.h"

#include "hotstuff/liveness.h"

using namespace hotstuff;

int main(int argc, char** argv)
{
	// int result = Catch::Session().run(argc, argv);
	std::cout << "test";

	if (argc != 2) {
		std::cout << "not enough arguments to instantiate replica";
		return 1;
	}

	std::string replica_id(argv[1]);
	std::string data_dir = "data_dir_" + replica_id;
	std::cout << replica_id << std::endl;
	std::cout << data_dir << std::endl;

	clear_all_data_dirs(data_dir);
	make_all_data_dirs(data_dir);

	auto [pk1, sk1] = deterministic_keypair_from_uint64(1);
	auto [pk2, sk2] = deterministic_keypair_from_uint64(2);
	auto [pk3, sk3] = deterministic_keypair_from_uint64(3);
	auto [pk4, sk4] = deterministic_keypair_from_uint64(4);
	ReplicaInfo r1(0, pk1, "localhost", "9000", "9001", "data_dir_0");
	ReplicaInfo r2(1, pk2, "localhost", "9002", "9003", "data_dir_1");
	ReplicaInfo r3(2, pk3, "localhost", "9004", "9005", "data_dir_2");
	ReplicaInfo r4(3, pk4, "localhost", "9006", "9007", "data_dir_3");

	ReplicaConfig config;
	config.add_replica(r1);
	config.add_replica(r2);
	config.add_replica(r3);
	config.add_replica(r4);

	config.finish_init();

	auto vm = std::make_shared<CountingVM>();

	std::map<ReplicaID, SecretKey> m { 
		{0, sk1}, 
		{1, sk2}, 
		{2, sk3}, 
		{3, sk4}, 
	};

	// HotstuffApp app(config, r1.id, sk1, vm);
	
	HotstuffApp app(config, stoi(replica_id), m[stoi(replica_id)], vm);
	app.init_clean();

	if (stoi(replica_id) == 0) {
		PaceMakerWaitQC pmaker(app);
		pmaker.set_self_as_proposer();
		app.put_vm_in_proposer_mode();

		std::cout << "5 proposes";
		{
			for (size_t i = 0; i < 5; i++)
			{
				pmaker.do_propose();
				pmaker.wait_for_qc();
			}

			std::cout << (vm->get_last_committed_height() == 0);
			// this test case will break if we change how many proposals
			// are buffered within the vm bridge.
			// Right now 3 -- so vm runs 3 ahead of proposed value,
			// which is 2 ahead of last committed.
			std::cout << (vm->get_speculative_height() == 5);
		}

		while(true) {

		}
	}
	else {
		while(true) {

		}
	}

	return 0;
}
